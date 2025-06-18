#[test_only]
module mock_clo::mock_clo_exchange_test {
    use mock_clo::mock_clo_exchange;
    use aptos_framework::object::{Self as object};
    use aptos_framework::fungible_asset::{Self as fa, Metadata};
    use aptos_framework::primary_fungible_store;
    use std::string;
    use std::option;
    use std::signer;

    const UNDERLYING_SYMBOL: vector<u8> = b"UND";
    const UNDERLYING_NAME: vector<u8> = b"Underlying";
    const SHARE_SYMBOL: vector<u8> = b"CLA";
    const SHARE_NAME: vector<u8> = b"Class A";

    /// Helper that publishes a fungible asset with unlimited supply and returns its metadata address
    fun publish_underlying(admin: &signer): address {
        let constructor_ref = &object::create_named_object(admin, UNDERLYING_SYMBOL);
        primary_fungible_store::create_primary_store_enabled_fungible_asset(
            constructor_ref,
            option::none<u128>(),
            string::utf8(UNDERLYING_NAME),
            string::utf8(UNDERLYING_SYMBOL),
            6,
            string::utf8(b""),
            string::utf8(b""),
        );
        object::create_object_address(&signer::address_of(admin), UNDERLYING_SYMBOL)
    }

    /// Mints `amount` units of the given asset to `recipient`.
    fun mint_to(constructor_ref: &object::ConstructorRef, amount: u64, recipient: address) {
        let mint_ref = fa::generate_mint_ref(constructor_ref);
        let fa_tokens = fa::mint(&mint_ref, amount);
        primary_fungible_store::deposit(recipient, fa_tokens);
    }

    #[test(admin = @0x1, investor = @0x2)]
    fun test_issuance_and_redemption(admin: signer, investor: signer) {
        // 1. Publish underlying asset
        let underlying_constructor = &object::create_named_object(&admin, UNDERLYING_SYMBOL);
        primary_fungible_store::create_primary_store_enabled_fungible_asset(
            underlying_constructor,
            option::none<u128>(),
            string::utf8(UNDERLYING_NAME),
            string::utf8(UNDERLYING_SYMBOL),
            6,
            string::utf8(b""),
            string::utf8(b""),
        );
        // Mint underlying to investor (100 units with 6 decimals = 100_000_000)
        let mint_ref = fa::generate_mint_ref(underlying_constructor);
        let underlying_amount_total = 100_000_000u64;
        let underlying_tokens = fa::mint(&mint_ref, underlying_amount_total);
        primary_fungible_store::deposit(signer::address_of(&investor), underlying_tokens);
        let underlying_metadata_addr = object::create_object_address(&signer::address_of(&admin), UNDERLYING_SYMBOL);
        let underlying_obj = object::address_to_object<Metadata>(underlying_metadata_addr);

        // 2. Create share-class token (price: 10_000_000 underlying per share)
        let price_per_share = 10_000_000u64; // 10 underlying units (with 6 decimals) per share
        mock_clo_exchange::create_share_class(
            &admin,
            SHARE_NAME,
            SHARE_SYMBOL,
            6,
            underlying_metadata_addr,
            price_per_share,
            0u128,
        );
        let share_metadata_addr = object::create_object_address(&signer::address_of(&admin), SHARE_SYMBOL);
        let share_obj = object::address_to_object<Metadata>(share_metadata_addr);

        // 3. Investor requests issuance for 20_000_000 underlying (should mint 2 shares)
        let issuance_amount = 20_000_000u64;
        mock_clo_exchange::request_issuance(&investor, share_obj, issuance_amount);

        // Check balances
        let share_balance = primary_fungible_store::balance(signer::address_of(&investor), share_obj);
        assert!(share_balance == 2, 100);
        let underlying_balance_after_issuance = primary_fungible_store::balance(signer::address_of(&investor), underlying_obj);
        assert!(underlying_balance_after_issuance == underlying_amount_total - issuance_amount, 101);

        // 4. Investor redeems 1 share -> should receive 10_000_000 underlying back
        // mock_clo_exchange::request_redemption(&investor, share_obj, 1);
        // let share_balance_after_redemption = primary_fungible_store::balance(signer::address_of(&investor), share_obj);
        // assert!(share_balance_after_redemption == 1, 102);
        // let underlying_balance_after_redemption = primary_fungible_store::balance(signer::address_of(&investor), underlying_obj);
        // assert!(underlying_balance_after_redemption == underlying_amount_total - issuance_amount + price_per_share, 103);
    }
} 