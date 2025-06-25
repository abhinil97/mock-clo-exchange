module mock_clo::mock_clo_exchange_advanced {
    use aptos_framework::fungible_asset::{Self as fa, Metadata, MintRef, BurnRef, TransferRef};
    use aptos_framework::object::{Self as object, Object};
    use aptos_framework::primary_fungible_store;
    use std::signer;
    use std::string;
    use std::option;
    use std::vector;

    // Holds all config and capabilities for a particular shareclass
    // This resource is stored **under the address of the shareclass `Metadata` object**.
    #[resource_group_member(group = aptos_framework::object::ObjectGroup)]
    struct ShareClassData has key {
        /// Metadata object address of the accepted underlying asset
        underlying_metadata: address,
        /// Net Asset Value - total value of underlying assets in the fund
        nav: u64,
        /// Caps required to mint / burn / transfer shares on behalf of the protocol
        mint_cap: MintRef,
        burn_cap: BurnRef,
        transfer_cap: TransferRef,
    }

    struct ProtocolConfig has key {
        admin: address,
    }

    /// Represents a pending redemption request
    struct PendingRedemption has store, copy, drop {
        investor: address,
        share_class: address,
        share_amount: u64,
        underlying_amount: u64,
        request_id: u64,
    }

    /// Global registry of all pending redemptions
    struct PendingRedemptionRegistry has key {
        pending_redemptions: vector<PendingRedemption>,
        next_request_id: u64,
    }

    /// Called automatically when the module is published
    fun init_module(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        assert!(admin_addr == @mock_clo, 0);

        move_to(
            admin,
            ProtocolConfig {
                admin: admin_addr,
            }
        );

        // Initialize pending redemption registry
        move_to(
            admin,
            PendingRedemptionRegistry {
                pending_redemptions: vector::empty<PendingRedemption>(),
                next_request_id: 1,
            }
        );
    }

    public entry fun create_share_class(
        admin: &signer,
        name: vector<u8>,
        symbol: vector<u8>,
        decimals: u8,
        underlying_token_addr: address,
        initial_nav: u64,
        initial_shares_to_mint: u64,
        max_supply: u128,
    ) {
        let admin_addr = signer::address_of(admin);
        assert!(admin_addr == @mock_clo, 0);

        let constructor_ref = &object::create_named_object(admin, symbol);

        let max_supply_opt = if (max_supply == 0) {
            option::none<u128>()
        } else {
            option::some(max_supply)
        };

        // Enable automatic primary-store creation for investors
        primary_fungible_store::create_primary_store_enabled_fungible_asset(
            constructor_ref,
            max_supply_opt,
            string::utf8(name),
            string::utf8(symbol),
            decimals,
            string::utf8(b""), // icon_uri
            string::utf8(b""), // project_uri
        );

        let mint_cap = fa::generate_mint_ref(constructor_ref);
        let burn_cap = fa::generate_burn_ref(constructor_ref);
        let transfer_cap = fa::generate_transfer_ref(constructor_ref);

        let share_signer = object::generate_signer(constructor_ref);


        // Mint initial shares to admin to establish share supply for price calculation
        let initial_shares = fa::mint(&mint_cap, initial_shares_to_mint);
        primary_fungible_store::deposit(admin_addr, initial_shares);

        // Ensure the admin can hold the underlying asset (store in admin wallet instead of vault)
        let underlying_metadata = object::address_to_object<Metadata>(underlying_token_addr);
        primary_fungible_store::ensure_primary_store_exists(
            admin_addr, 
            underlying_metadata,
        );

        move_to(
            &share_signer,
            ShareClassData {
                underlying_metadata: underlying_token_addr,
                nav: initial_nav,
                mint_cap: mint_cap,
                burn_cap: burn_cap,
                transfer_cap: transfer_cap,
            },
        );
    }

    /// Calculate current price per share based on NAV and total supply
    /// Price = NAV / Total Share Supply
    fun calculate_price_per_share(share_class: Object<Metadata>): u64 acquires ShareClassData {
        let share_addr = object::object_address(&share_class);
        let data = borrow_global<ShareClassData>(share_addr);
        let total_supply = fa::supply(share_class);
        
        // Handle case where total supply is 0 (shouldn't happen after initial mint)
        if (option::is_some(&total_supply)) {
            let supply_value = *option::borrow(&total_supply);
            if (supply_value > 0) {
                return data.nav / (supply_value as u64)
            }
        };
        
        // Fallback: return 1 if no supply (shouldn't happen)
        1u64
    }

    // Investor deposits underlying asset and receives shares
    // Shares minted = underlying_amount / current_price_per_share
    // NAV increases by underlying_amount
    public entry fun request_issuance(
        investor: &signer,
        share_class: Object<Metadata>,
        underlying_amount: u64,
    ) acquires ShareClassData, ProtocolConfig {
        // Calculate current price per share BEFORE mutable borrow
        let current_price = calculate_price_per_share(share_class);
        
        // Calculate shares to mint based on current price
        let shares_to_mint = underlying_amount / current_price;
        assert!(shares_to_mint > 0, 3); // Must mint at least 1 share

        let share_addr = object::object_address(&share_class);
        let data = borrow_global_mut<ShareClassData>(share_addr);

        let underlying_meta = object::address_to_object<Metadata>(data.underlying_metadata);
        let underlying_fa = primary_fungible_store::withdraw(investor, underlying_meta, underlying_amount);

        // Deposit underlying asset to the admin wallet
        let config = borrow_global<ProtocolConfig>(@mock_clo);
        primary_fungible_store::deposit(config.admin, underlying_fa);

        // Mint and send shares to investor
        let new_shares = fa::mint(&data.mint_cap, shares_to_mint);
        primary_fungible_store::deposit(signer::address_of(investor), new_shares);
    }

    // Investor requests redemption - burns shares and creates pending redemption
    // Underlying amount = shares * current_price_per_share
    // Admin must approve redemption separately
    public entry fun request_redemption(
        investor: &signer,
        share_class: Object<Metadata>,
        share_amount: u64,
    ) acquires ShareClassData, PendingRedemptionRegistry {
        let investor_addr = signer::address_of(investor);
        
        // Calculate current price per share BEFORE mutable borrow
        let current_price = calculate_price_per_share(share_class);
        
        // Calculate underlying amount based on current price
        let underlying_amount: u64 = share_amount * current_price;

        let share_addr = object::object_address(&share_class);
        let data = borrow_global_mut<ShareClassData>(share_addr);

        // Burn investor's shares immediately
        let shares_fa = primary_fungible_store::withdraw(investor, share_class, share_amount);
        fa::burn(&data.burn_cap, shares_fa);

        // Create pending redemption request
        let registry = borrow_global_mut<PendingRedemptionRegistry>(@mock_clo);
        let request_id = registry.next_request_id;
        registry.next_request_id = registry.next_request_id + 1;

        let pending_redemption = PendingRedemption {
            investor: investor_addr,
            share_class: share_addr,
            share_amount,
            underlying_amount,
            request_id,
        };

        vector::push_back(&mut registry.pending_redemptions, pending_redemption);
    }

    /// Admin approves a specific redemption request and sends underlying tokens
    public entry fun approve_redemption(
        admin: &signer,
        request_id: u64,
    ) acquires ProtocolConfig, PendingRedemptionRegistry, ShareClassData {
        let admin_addr = signer::address_of(admin);
        let config = borrow_global<ProtocolConfig>(@mock_clo);
        assert!(admin_addr == config.admin, 1); // Only admin can approve

        let registry = borrow_global_mut<PendingRedemptionRegistry>(@mock_clo);
        
        // Find and remove the pending redemption
        let (pending_redemption, found) = find_and_remove_pending_redemption(
            &mut registry.pending_redemptions, 
            request_id
        );
        assert!(found, 2); // Request ID not found

        // Get underlying metadata from share class data
        let share_data = borrow_global<ShareClassData>(pending_redemption.share_class);
        let underlying_meta = object::address_to_object<Metadata>(share_data.underlying_metadata);

        // Transfer underlying tokens from admin wallet to investor
        let underlying_fa = primary_fungible_store::withdraw(
            admin, 
            underlying_meta, 
            pending_redemption.underlying_amount
        );
        
        primary_fungible_store::deposit(pending_redemption.investor, underlying_fa);
    }

    /// Admin rejects a specific redemption request and re-mints shares to investor
    public entry fun reject_redemption(
        admin: &signer,
        request_id: u64,
    ) acquires ProtocolConfig, PendingRedemptionRegistry, ShareClassData {
        let admin_addr = signer::address_of(admin);
        let config = borrow_global<ProtocolConfig>(@mock_clo);
        assert!(admin_addr == config.admin, 1); // Only admin can reject

        let registry = borrow_global_mut<PendingRedemptionRegistry>(@mock_clo);
        
        // Find and remove the pending redemption
        let (pending_redemption, found) = find_and_remove_pending_redemption(
            &mut registry.pending_redemptions, 
            request_id
        );
        assert!(found, 2); // Request ID not found

        // Re-mint shares back to investor since redemption was rejected
        let share_data = borrow_global_mut<ShareClassData>(pending_redemption.share_class);
        let new_shares = fa::mint(&share_data.mint_cap, pending_redemption.share_amount);
        primary_fungible_store::deposit(pending_redemption.investor, new_shares);
    }

    /// Helper function to find and remove a pending redemption by request_id
    fun find_and_remove_pending_redemption(
        pending_redemptions: &mut vector<PendingRedemption>,
        request_id: u64,
    ): (PendingRedemption, bool) {
        let len = vector::length(pending_redemptions);
        let i = 0;
        
        while (i < len) {
            let redemption = vector::borrow(pending_redemptions, i);
            if (redemption.request_id == request_id) {
                let found_redemption = vector::remove(pending_redemptions, i);
                return (found_redemption, true)
            };
            i = i + 1;
        };
        
        // Return dummy redemption if not found
        let dummy = PendingRedemption {
            investor: @0x0,
            share_class: @0x0,
            share_amount: 0,
            underlying_amount: 0,
            request_id: 0,
        };
        (dummy, false)
    }

    /// Admin can batch approve multiple redemptions
    public entry fun batch_approve_redemptions(
        admin: &signer,
        request_ids: vector<u64>,
    ) acquires ProtocolConfig, PendingRedemptionRegistry, ShareClassData {
        let len = vector::length(&request_ids);
        let i = 0;
        
        while (i < len) {
            let request_id = *vector::borrow(&request_ids, i);
            approve_redemption(admin, request_id);
            i = i + 1;
        };
    }

    /// Admin can update the exchange rate for any share class
    public entry fun update_exchange_rate(
        admin: &signer,
        share_class: Object<Metadata>,
        new_exchange_rate: u64,
    ) acquires ProtocolConfig, ShareClassData {
        let admin_addr = signer::address_of(admin);
        let config = borrow_global<ProtocolConfig>(@mock_clo);
        assert!(admin_addr == config.admin, 1); // Only admin can update exchange rate
        assert!(new_exchange_rate > 0, 4); // Exchange rate must be positive

        let share_addr = object::object_address(&share_class);
        let data = borrow_global_mut<ShareClassData>(share_addr);
        data.nav = new_exchange_rate;
    }

    #[view]
    public fun get_current_price_per_share(share_class: Object<Metadata>): u64 acquires ShareClassData {
        calculate_price_per_share(share_class)
    }

    #[view]
    public fun get_nav(metadata_addr: address): u64 acquires ShareClassData {
        borrow_global<ShareClassData>(metadata_addr).nav
    }

    #[view]
    public fun get_total_supply(share_class: Object<Metadata>): u128 {
        let total_supply = fa::supply(share_class);
        if (option::is_some(&total_supply)) {
            *option::borrow(&total_supply)
        } else {
            0
        }
    }

    #[view]
    public fun underlying_metadata(metadata_addr: address): address acquires ShareClassData {
        borrow_global<ShareClassData>(metadata_addr).underlying_metadata
    }

    #[view]
    public fun get_admin_vault_address(): address acquires ProtocolConfig {
        let config = borrow_global<ProtocolConfig>(@mock_clo);
        config.admin
    }

    #[view]
    public fun get_admin_address(): address acquires ProtocolConfig {
        let config = borrow_global<ProtocolConfig>(@mock_clo);
        config.admin
    }

    #[view]
    public fun get_pending_redemptions(): vector<PendingRedemption> acquires PendingRedemptionRegistry {
        let registry = borrow_global<PendingRedemptionRegistry>(@mock_clo);
        registry.pending_redemptions
    }

    #[view]
    public fun get_pending_redemption_count(): u64 acquires PendingRedemptionRegistry {
        let registry = borrow_global<PendingRedemptionRegistry>(@mock_clo);
        vector::length(&registry.pending_redemptions)
    }

    #[view]
    public fun get_next_request_id(): u64 acquires PendingRedemptionRegistry {
        let registry = borrow_global<PendingRedemptionRegistry>(@mock_clo);
        registry.next_request_id
    }

    #[test_only]
    public fun init_module_for_test(admin: &signer) {
        init_module(admin);
    }
} 