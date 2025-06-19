module mock_clo::mock_clo_exchange {
    use aptos_framework::fungible_asset::{Self as fa, Metadata, MintRef, BurnRef, TransferRef};
    use aptos_framework::object::{Self as object, Object};
    use aptos_framework::primary_fungible_store;
    use aptos_framework::account::{Self, SignerCapability};
    use std::signer;
    use std::string;
    use std::option;

    // Holds all config and capabilities for a particular shareclass
    // This resource is stored **under the address of the shareclass `Metadata` object**.
    #[resource_group_member(group = aptos_framework::object::ObjectGroup)]
    struct ShareClassData has key {
        /// Metadata object address of the accepted underlying asset
        underlying_metadata: address,
        /// Units of underlying required to mint **1** share
        price_per_share: u64,
        /// Caps required to mint / burn / transfer shares on behalf of the protocol
        mint_cap: MintRef,
        burn_cap: BurnRef,
        transfer_cap: TransferRef,
    }

    struct ProtocolConfig has key {
        admin: address,
        vault_signer_cap: SignerCapability, // Signer capability for the protocol vault
    }

    /// Called automatically when the module is published
    fun init_module(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        assert!(admin_addr == @mock_clo, 0);
        
        // Create a resource account for the protocol vault
        let (vault_signer, vault_signer_cap) = account::create_resource_account(admin, b"VAULT");
        let _vault_addr = signer::address_of(&vault_signer);

        move_to(
            admin,
            ProtocolConfig {
                admin: admin_addr,
                vault_signer_cap,
            }
        );
    }

    public entry fun create_share_class(
        admin: &signer,
        name: vector<u8>,
        symbol: vector<u8>,
        decimals: u8,
        underlying_token_addr: address,
        price_per_share: u64,
        max_supply: u128,
    ) acquires ProtocolConfig {
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
        move_to(
            &share_signer,
            ShareClassData {
                underlying_metadata: underlying_token_addr,
                price_per_share: price_per_share,
                mint_cap: mint_cap,
                burn_cap: burn_cap,
                transfer_cap: transfer_cap,
            },
        );

        // Ensure the vault can hold the underlying asset
        let underlying_metadata = object::address_to_object<Metadata>(underlying_token_addr);
        let config = borrow_global<ProtocolConfig>(@mock_clo);
        let vault_signer = account::create_signer_with_capability(&config.vault_signer_cap);
        let vault_addr = signer::address_of(&vault_signer);
        
        primary_fungible_store::ensure_primary_store_exists(
            vault_addr, 
            underlying_metadata,
        );
    }

    /// Investor deposits underlying asset and receives shares
    public entry fun request_issuance(
        investor: &signer,
        share_class: Object<Metadata>,
        underlying_amount: u64,
    ) acquires ShareClassData, ProtocolConfig {
        let share_addr = object::object_address(&share_class);
        let data = borrow_global_mut<ShareClassData>(share_addr);

        assert!(underlying_amount % data.price_per_share == 0, 0);
        let shares_to_mint = underlying_amount / data.price_per_share;

        let underlying_meta = object::address_to_object<Metadata>(data.underlying_metadata);
        let underlying_fa = primary_fungible_store::withdraw(investor, underlying_meta, underlying_amount);

        // Deposit underlying asset to the protocol vault
        let config = borrow_global<ProtocolConfig>(@mock_clo);
        let vault_signer = account::create_signer_with_capability(&config.vault_signer_cap);
        let vault_addr = signer::address_of(&vault_signer);
        primary_fungible_store::deposit(vault_addr, underlying_fa);

        // Mint and send shares to investor
        let new_shares = fa::mint(&data.mint_cap, shares_to_mint);
        primary_fungible_store::deposit(signer::address_of(investor), new_shares);
    }

    /// Investor redeems shares for underlying asset
    public entry fun request_redemption(
        investor: &signer,
        share_class: Object<Metadata>,
        share_amount: u64,
    ) acquires ShareClassData, ProtocolConfig {
        let share_addr = object::object_address(&share_class);
        let data = borrow_global_mut<ShareClassData>(share_addr);

        let underlying_amount: u64 = share_amount * data.price_per_share;

        // Burn investor's shares
        let shares_fa = primary_fungible_store::withdraw(investor, share_class, share_amount);
        fa::burn(&data.burn_cap, shares_fa);

        // Withdraw underlying asset from vault and send to investor
        let underlying_meta = object::address_to_object<Metadata>(data.underlying_metadata);
        let config = borrow_global<ProtocolConfig>(@mock_clo);
        let vault_signer = account::create_signer_with_capability(&config.vault_signer_cap);
        
        let underlying_to_return = primary_fungible_store::withdraw(
            &vault_signer, 
            underlying_meta, 
            underlying_amount
        );
        
        primary_fungible_store::deposit(signer::address_of(investor), underlying_to_return);
    }

    #[view]
    public fun exchange_price(metadata_addr: address): u64 acquires ShareClassData {
        borrow_global<ShareClassData>(metadata_addr).price_per_share
    }

    #[view]
    public fun underlying_metadata(metadata_addr: address): address acquires ShareClassData {
        borrow_global<ShareClassData>(metadata_addr).underlying_metadata
    }

    #[view]
    public fun get_vault_address(): address acquires ProtocolConfig {
        let config = borrow_global<ProtocolConfig>(@mock_clo);
        let vault_signer = account::create_signer_with_capability(&config.vault_signer_cap);
        signer::address_of(&vault_signer)
    }

    #[test_only]
    public fun init_module_for_test(admin: &signer) {
        init_module(admin);
    }
} 