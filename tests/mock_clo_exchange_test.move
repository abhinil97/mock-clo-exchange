#[test_only]
module mock_clo::mock_clo_exchange_test {
    use mock_clo::mock_clo_exchange;
    use aptos_framework::object::{Self as object};
    use aptos_framework::fungible_asset::{Self as fa, Metadata};
    use aptos_framework::primary_fungible_store;
    use std::string;
    use std::option;
    use std::signer;
    use std::vector;

    // Universal underlying token (USDC)
    const USDC_SYMBOL: vector<u8> = b"USDC";
    const USDC_NAME: vector<u8> = b"USD Coin";
    const SHARE_SYMBOL_BASE: vector<u8> = b"CLA";
    const SHARE_NAME_BASE: vector<u8> = b"Class A";
    
    // Error codes
    const E_INCORRECT_SHARE_BALANCE: u64 = 100;
    const E_INCORRECT_UNDERLYING_BALANCE: u64 = 101;
    const E_INCORRECT_SHARE_BALANCE_AFTER_REDEMPTION: u64 = 102;
    const E_INCORRECT_UNDERLYING_BALANCE_AFTER_REDEMPTION: u64 = 103;
    const E_INCORRECT_VAULT_BALANCE: u64 = 104;

    /// Helper to create unique share class names by appending a suffix
    fun get_unique_name(base: vector<u8>, suffix: u64): vector<u8> {
        let result = copy base;
        
        // Add a simple separator
        vector::push_back(&mut result, 95); // ASCII '_'
        
        // For simplicity, just add the numeric value of suffix as ASCII
        // This works for small numbers which is fine for tests
        if (suffix == 0) {
            vector::push_back(&mut result, 48); // ASCII '0'
        } else if (suffix == 1) {
            vector::push_back(&mut result, 49); // ASCII '1'
        } else if (suffix == 2) {
            vector::push_back(&mut result, 50); // ASCII '2'
        } else if (suffix == 3) {
            vector::push_back(&mut result, 51); // ASCII '3'
        } else if (suffix == 4) {
            vector::push_back(&mut result, 52); // ASCII '4'
        } else if (suffix == 5) {
            vector::push_back(&mut result, 53); // ASCII '5'
        } else if (suffix == 6) {
            vector::push_back(&mut result, 54); // ASCII '6'
        } else if (suffix == 7) {
            vector::push_back(&mut result, 55); // ASCII '7'
        } else if (suffix == 8) {
            vector::push_back(&mut result, 56); // ASCII '8'
        } else if (suffix == 9) {
            vector::push_back(&mut result, 57); // ASCII '9'
        } else {
            // For numbers > 9, just add multiple digits
            // This is a simplified approach for tests
            vector::push_back(&mut result, 49); // ASCII '1'
            vector::push_back(&mut result, 48); // ASCII '0' (making it "10+")
        };
        
        result
    }

    /// Global USDC token creation - called once per test suite
    struct USDCInfo has key {
        metadata_addr: address,
        metadata_obj: object::Object<Metadata>,
        mint_ref: fa::MintRef,
    }

    /// Creates the universal USDC token that all tests will use
    fun create_usdc_token(admin: &signer): (address, object::Object<Metadata>) {
        let usdc_constructor = &object::create_named_object(admin, USDC_SYMBOL);
        
        primary_fungible_store::create_primary_store_enabled_fungible_asset(
            usdc_constructor,
            option::none<u128>(),
            string::utf8(USDC_NAME),
            string::utf8(USDC_SYMBOL),
            6,
            string::utf8(b""),
            string::utf8(b""),
        );
        
        let mint_ref = fa::generate_mint_ref(usdc_constructor);
        let usdc_metadata_addr = object::create_object_address(&signer::address_of(admin), USDC_SYMBOL);
        let usdc_obj = object::address_to_object<Metadata>(usdc_metadata_addr);
        
        // Store USDC info globally for all tests to use
        move_to(
            admin,
            USDCInfo {
                metadata_addr: usdc_metadata_addr,
                metadata_obj: usdc_obj,
                mint_ref,
            }
        );
        
        (usdc_metadata_addr, usdc_obj)
    }

    /// Mints USDC to a recipient using the global USDC token
    fun mint_usdc_to(admin: &signer, amount: u64, recipient: address) acquires USDCInfo {
        let usdc_info = borrow_global<USDCInfo>(signer::address_of(admin));
        let fa_tokens = fa::mint(&usdc_info.mint_ref, amount);
        primary_fungible_store::deposit(recipient, fa_tokens);
    }

    /// Gets the global USDC metadata object
    fun get_usdc_metadata(admin: &signer): object::Object<Metadata> acquires USDCInfo {
        let usdc_info = borrow_global<USDCInfo>(signer::address_of(admin));
        usdc_info.metadata_obj
    }

    /// Gets the global USDC metadata address
    fun get_usdc_metadata_addr(admin: &signer): address acquires USDCInfo {
        let usdc_info = borrow_global<USDCInfo>(signer::address_of(admin));
        usdc_info.metadata_addr
    }

    /// Creates a share class and returns its metadata address and object
    fun create_share_class_token(
        admin: &signer, 
        price_per_share: u64,
        suffix: u64
    ): (address, object::Object<Metadata>) acquires USDCInfo {
        let share_name = get_unique_name(SHARE_NAME_BASE, suffix);
        let share_symbol = get_unique_name(SHARE_SYMBOL_BASE, suffix);
        let usdc_metadata_addr = get_usdc_metadata_addr(admin);
        
        mock_clo_exchange::create_share_class(
            admin,
            share_name,
            share_symbol,
            6,
            usdc_metadata_addr,
            price_per_share,
            0u128, // Unlimited supply
        );
        
        let share_metadata_addr = object::create_object_address(&signer::address_of(admin), share_symbol);
        let share_obj = object::address_to_object<Metadata>(share_metadata_addr);
        
        (share_metadata_addr, share_obj)
    }

    /// Setup function that creates USDC, initializes protocol, mints USDC to investor, and creates share class
    fun setup(
        admin: &signer, 
        investor: &signer, 
        underlying_amount: u64, 
        price_per_share: u64,
        suffix: u64
    ): (object::Object<Metadata>, object::Object<Metadata>, u64) acquires USDCInfo {
        // 1. Initialize the protocol (required in test environment)
        mock_clo_exchange::init_module_for_test(admin);
        
        // 2. Create universal USDC token
        let (_, usdc_obj) = create_usdc_token(admin);
        
        // 3. Mint USDC to investor
        mint_usdc_to(admin, underlying_amount, signer::address_of(investor));
        
        // 4. Create share-class token
        let (_, share_obj) = create_share_class_token(admin, price_per_share, suffix);
        
        (usdc_obj, share_obj, underlying_amount)
    }

    #[test(admin = @mock_clo, investor = @0x2)]
    fun test_issuance_and_redemption(admin: signer, investor: signer) acquires USDCInfo {
        let underlying_amount_total = 100_000_000u64; // 100 USDC (with 6 decimals)
        let price_per_share = 5u64; // 5 USDC per share (simple value)
        let (underlying_obj, share_obj, underlying_amount_total) = setup(&admin, &investor, underlying_amount_total, price_per_share, 1);
        
        // Get vault address for balance checks
        let vault_addr = mock_clo_exchange::get_vault_address();
        
        // Investor requests issuance for 10_000_000 underlying (10 USDC)
        // With 1000 conversion: (10_000_000 / 5) * 1000 = 2_000_000_000 share units
        // But shares have 6 decimals, so this is 2000 share tokens (2000 * 10^6 units)
        let issuance_amount = 10_000_000u64;
        mock_clo_exchange::request_issuance(&investor, share_obj, issuance_amount);

        // Check balances - should have 2_000_000_000 share units (2000 * 10^6)
        let share_balance = primary_fungible_store::balance(signer::address_of(&investor), share_obj);
        assert!(share_balance == 2_000_000_000, E_INCORRECT_SHARE_BALANCE);
        
        let underlying_balance_after_issuance = primary_fungible_store::balance(signer::address_of(&investor), underlying_obj);
        assert!(underlying_balance_after_issuance == underlying_amount_total - issuance_amount, E_INCORRECT_UNDERLYING_BALANCE);
        
        // Check vault has the underlying tokens
        let vault_balance = primary_fungible_store::balance(vault_addr, underlying_obj);
        assert!(vault_balance == issuance_amount, E_INCORRECT_VAULT_BALANCE);

        // Investor redeems 1_000_000_000 share units (equivalent to 1000 share tokens)
        // Should receive: (1_000_000_000 * 5) / 1000 = 5_000_000 underlying (5 USDC)
        mock_clo_exchange::request_redemption(&investor, share_obj, 1_000_000_000);
        
        let share_balance_after_redemption = primary_fungible_store::balance(signer::address_of(&investor), share_obj);
        assert!(share_balance_after_redemption == 1_000_000_000, E_INCORRECT_SHARE_BALANCE_AFTER_REDEMPTION);
        
        let underlying_balance_after_redemption = primary_fungible_store::balance(signer::address_of(&investor), underlying_obj);
        assert!(underlying_balance_after_redemption == underlying_amount_total - issuance_amount + 5_000_000, E_INCORRECT_UNDERLYING_BALANCE_AFTER_REDEMPTION);
        
        // Check vault balance decreased
        let vault_balance_after_redemption = primary_fungible_store::balance(vault_addr, underlying_obj);
        assert!(vault_balance_after_redemption == issuance_amount - 5_000_000, E_INCORRECT_VAULT_BALANCE);
    }
    
    #[test(admin = @mock_clo, investor = @0x2)]
    fun test_multiple_issuances(admin: signer, investor: signer) acquires USDCInfo {
        let underlying_amount_total = 100_000_000u64; // 100 USDC (with 6 decimals)
        let price_per_share = 5u64; // 5 USDC per share (simple value)
        let (underlying_obj, share_obj, _) = setup(&admin, &investor, underlying_amount_total, price_per_share, 2);
        
        // First issuance - 10 USDC -> 2_000_000_000 share units (2000 * 10^6)
        let issuance_amount_1 = 10_000_000u64;
        mock_clo_exchange::request_issuance(&investor, share_obj, issuance_amount_1);
        
        let share_balance = primary_fungible_store::balance(signer::address_of(&investor), share_obj);
        assert!(share_balance == 2_000_000_000, E_INCORRECT_SHARE_BALANCE);
        
        // Second issuance - 5 USDC -> 1_000_000_000 more share units (total 3_000_000_000)
        let issuance_amount_2 = 5_000_000u64;
        mock_clo_exchange::request_issuance(&investor, share_obj, issuance_amount_2);
        
        let share_balance = primary_fungible_store::balance(signer::address_of(&investor), share_obj);
        assert!(share_balance == 3_000_000_000, E_INCORRECT_SHARE_BALANCE);
        
        let underlying_balance = primary_fungible_store::balance(signer::address_of(&investor), underlying_obj);
        assert!(underlying_balance == underlying_amount_total - issuance_amount_1 - issuance_amount_2, E_INCORRECT_UNDERLYING_BALANCE);
    }
    
    #[test(admin = @mock_clo, investor = @0x2)]
    fun test_full_redemption(admin: signer, investor: signer) acquires USDCInfo {
        let underlying_amount_total = 50_000_000u64; // 50 USDC (with 6 decimals)
        let price_per_share = 5u64; // 5 USDC per share (simple value)
        let (underlying_obj, share_obj, _) = setup(&admin, &investor, underlying_amount_total, price_per_share, 3);
        
        // Issue 50 USDC -> 10_000_000_000 share units (10000 * 10^6)
        let issuance_amount = 50_000_000u64;
        mock_clo_exchange::request_issuance(&investor, share_obj, issuance_amount);
        
        let share_balance = primary_fungible_store::balance(signer::address_of(&investor), share_obj);
        assert!(share_balance == 10_000_000_000, E_INCORRECT_SHARE_BALANCE);
        
        // Redeem all 10_000_000_000 share units
        mock_clo_exchange::request_redemption(&investor, share_obj, 10_000_000_000);
        
        let share_balance_after = primary_fungible_store::balance(signer::address_of(&investor), share_obj);
        assert!(share_balance_after == 0, E_INCORRECT_SHARE_BALANCE_AFTER_REDEMPTION);
        
        let underlying_balance_after = primary_fungible_store::balance(signer::address_of(&investor), underlying_obj);
        assert!(underlying_balance_after == underlying_amount_total, E_INCORRECT_UNDERLYING_BALANCE_AFTER_REDEMPTION);
    }
    
    #[test(admin = @mock_clo, investor1 = @0x2, investor2 = @0x3)]
    fun test_multiple_investors(admin: signer, investor1: signer, investor2: signer) acquires USDCInfo {
        let underlying_amount = 100_000_000u64; // 100 USDC (with 6 decimals)
        let price_per_share = 5u64; // 5 USDC per share (simple value)
        
        // Setup for investor1 (this creates USDC and the share class)
        let (_, share_obj, _) = setup(&admin, &investor1, underlying_amount, price_per_share, 4);
        
        // Mint USDC to investor2 (using the same USDC token)
        let investor2_addr = signer::address_of(&investor2);
        mint_usdc_to(&admin, underlying_amount, investor2_addr);
        
        // Investor1 issues 15 USDC -> 3_000_000_000 share units (3000 * 10^6)
        mock_clo_exchange::request_issuance(&investor1, share_obj, 15_000_000u64);
        let share_balance1 = primary_fungible_store::balance(signer::address_of(&investor1), share_obj);
        assert!(share_balance1 == 3_000_000_000, E_INCORRECT_SHARE_BALANCE);
        
        // Investor2 issues 10 USDC -> 2_000_000_000 share units (2000 * 10^6)
        mock_clo_exchange::request_issuance(&investor2, share_obj, 10_000_000u64);
        let share_balance2 = primary_fungible_store::balance(investor2_addr, share_obj);
        assert!(share_balance2 == 2_000_000_000, E_INCORRECT_SHARE_BALANCE);
        
        // Both investors redeem shares
        // Investor1 redeems 1_000_000_000 share units (equivalent to 1000 shares = 5 USDC)
        mock_clo_exchange::request_redemption(&investor1, share_obj, 1_000_000_000);
        // Investor2 redeems all 2_000_000_000 share units (equivalent to 2000 shares = 10 USDC)
        mock_clo_exchange::request_redemption(&investor2, share_obj, 2_000_000_000);
        
        // Check final balances
        let final_share_balance1 = primary_fungible_store::balance(signer::address_of(&investor1), share_obj);
        let final_share_balance2 = primary_fungible_store::balance(investor2_addr, share_obj);
        assert!(final_share_balance1 == 2_000_000_000, E_INCORRECT_SHARE_BALANCE_AFTER_REDEMPTION);
        assert!(final_share_balance2 == 0, E_INCORRECT_SHARE_BALANCE_AFTER_REDEMPTION);
    }
} 