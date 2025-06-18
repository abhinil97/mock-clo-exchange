module mock_clo::mock_clo_exchange {
    use aptos_framework::fungible_asset::{Self as fa, Metadata, MintRef, BurnRef, TransferRef};
    use aptos_framework::object::{Self as object, Object};
    use aptos_framework::primary_fungible_store;
    use std::signer;
    use std::string;
    use std::option;

    /// Holds all config and capabilities for a particular shareclass
    /// This resource is stored **under the address of the shareclass `Metadata` object**.
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


    public entry fun create_share_class(
        admin: &signer,
        name: vector<u8>,
        symbol: vector<u8>,
        decimals: u8,
        underlying_token_addr: address,
        price_per_share: u64,
        max_supply: u128,
    ) {
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

        let underlying_metadata = object::address_to_object<Metadata>(underlying_token_addr);
        primary_fungible_store::ensure_primary_store_exists(
            signer::address_of(&share_signer),
            underlying_metadata,
        );
    }

    
    public entry fun request_issuance(
        investor: &signer,
        share_class: Object<Metadata>,
        underlying_amount: u64,
    ) acquires ShareClassData {
        let share_addr = object::object_address(&share_class);
        let data = borrow_global_mut<ShareClassData>(share_addr);

        assert!(underlying_amount % data.price_per_share == 0, 0);
        let shares_to_mint = underlying_amount / data.price_per_share;

        let underlying_meta = object::address_to_object<Metadata>(data.underlying_metadata);
        let underlying_fa = primary_fungible_store::withdraw(investor, underlying_meta, underlying_amount);

        primary_fungible_store::deposit(share_addr, underlying_fa);

        let new_shares = fa::mint(&data.mint_cap, shares_to_mint);
        primary_fungible_store::deposit(signer::address_of(investor), new_shares);
    }

    // Redeem `share_amount` shares for their proportional underlying.
    public entry fun request_redemption(
        investor: &signer,
        share_class: Object<Metadata>,
        share_amount: u64,
    ) acquires ShareClassData {
        let share_addr = object::object_address(&share_class);
        let data = borrow_global_mut<ShareClassData>(share_addr);

        let underlying_amount: u64 = share_amount * data.price_per_share;

        let shares_fa = primary_fungible_store::withdraw(investor, share_class, share_amount);

        fa::burn(&data.burn_cap, shares_fa);

        let underlying_meta = object::address_to_object<Metadata>(data.underlying_metadata);
        let treasury_store = primary_fungible_store::primary_store(
            share_addr,
            underlying_meta,
        );
        let underlying_to_return = fa::withdraw_with_ref(
            &data.transfer_cap,
            treasury_store,
            underlying_amount,
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
} 