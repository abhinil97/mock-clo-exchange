#[test_only]
module mock_clo::mock_clo_exchange_advanced_test {
    use mock_clo::mock_clo_exchange_advanced;
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
    const E_INCORRECT_ADMIN_BALANCE: u64 = 104;
    const E_INCORRECT_PENDING_COUNT: u64 = 105;
    const E_INCORRECT_REQUEST_ID: u64 = 106;

    /// Helper to create unique share class names by appending a suffix
    fun get_unique_name(base: vector<u8>, suffix: u64): vector<u8> {
        let result = copy base;
        
        // Add a simple separator
        vector::push_back(&mut result, 95); // ASCII '_'
        
        // For simplicity, just add the numeric value of suffix as ASCII
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
        
        mock_clo_exchange_advanced::create_share_class(
            admin,
            share_name,
            share_symbol,
            6,
            usdc_metadata_addr,
            price_per_share,
            1u64, // Mint 1 share initially so NAV/Supply = price_per_share
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
        mock_clo_exchange_advanced::init_module_for_test(admin);
        
        // 2. Create universal USDC token
        let (_, usdc_obj) = create_usdc_token(admin);
        
        // 3. Mint USDC to investor
        mint_usdc_to(admin, underlying_amount, signer::address_of(investor));
        
        // 4. Create share-class token
        let (_, share_obj) = create_share_class_token(admin, price_per_share, suffix);
        
        (usdc_obj, share_obj, underlying_amount)
    }

    #[test(admin = @mock_clo, investor = @0x2)]
    fun test_issuance_and_pending_redemption(admin: signer, investor: signer) acquires USDCInfo {
        let underlying_amount_total = 100_000_000u64;
        let price_per_share = 10_000_000u64; // 10 underlying units per share
        let (underlying_obj, share_obj, underlying_amount_total) = setup(&admin, &investor, underlying_amount_total, price_per_share, 1);
        
        // Get admin address (acts as vault)
        let admin_addr = mock_clo_exchange_advanced::get_admin_address();
        
        // 1. Investor requests issuance for 20_000_000 underlying (should mint 2 shares)
        let issuance_amount = 20_000_000u64;
        mock_clo_exchange_advanced::request_issuance(&investor, share_obj, issuance_amount);

        // Check balances after issuance
        let share_balance = primary_fungible_store::balance(signer::address_of(&investor), share_obj);
        assert!(share_balance == 2, E_INCORRECT_SHARE_BALANCE);
        
        let underlying_balance_after_issuance = primary_fungible_store::balance(signer::address_of(&investor), underlying_obj);
        assert!(underlying_balance_after_issuance == underlying_amount_total - issuance_amount, E_INCORRECT_UNDERLYING_BALANCE);
        
        // Check admin has the underlying tokens
        let admin_balance = primary_fungible_store::balance(admin_addr, underlying_obj);
        assert!(admin_balance == issuance_amount, E_INCORRECT_ADMIN_BALANCE);

        // 2. Investor requests redemption for 1 share -> should create pending redemption
        mock_clo_exchange_advanced::request_redemption(&investor, share_obj, 1);
        
        // Check shares were burned
        let share_balance_after_redemption_request = primary_fungible_store::balance(signer::address_of(&investor), share_obj);
        assert!(share_balance_after_redemption_request == 1, E_INCORRECT_SHARE_BALANCE_AFTER_REDEMPTION);
        
        // Check pending redemption was created
        let pending_count = mock_clo_exchange_advanced::get_pending_redemption_count();
        assert!(pending_count == 1, E_INCORRECT_PENDING_COUNT);
        
        // Check next request ID incremented
        let next_id = mock_clo_exchange_advanced::get_next_request_id();
        assert!(next_id == 2, E_INCORRECT_REQUEST_ID);
        
        // Investor should not have received underlying tokens yet
        let underlying_balance_after_redemption_request = primary_fungible_store::balance(signer::address_of(&investor), underlying_obj);
        assert!(underlying_balance_after_redemption_request == underlying_amount_total - issuance_amount, E_INCORRECT_UNDERLYING_BALANCE);
    }

    #[test(admin = @mock_clo, investor = @0x2)]
    fun test_admin_approve_redemption(admin: signer, investor: signer) acquires USDCInfo {
        let underlying_amount_total = 100_000_000u64;
        let price_per_share = 10_000_000u64;
        let (underlying_obj, share_obj, _) = setup(&admin, &investor, underlying_amount_total, price_per_share, 2);
        
        // Issue shares
        let issuance_amount = 50_000_000u64; // 5 shares
        mock_clo_exchange_advanced::request_issuance(&investor, share_obj, issuance_amount);
        
        // Request redemption
        mock_clo_exchange_advanced::request_redemption(&investor, share_obj, 2); // 2 shares
        
        // Verify pending redemption exists
        let pending_count = mock_clo_exchange_advanced::get_pending_redemption_count();
        assert!(pending_count == 1, E_INCORRECT_PENDING_COUNT);
        
        // Admin approves redemption (request_id = 1)
        mock_clo_exchange_advanced::approve_redemption(&admin, 1);
        
        // Check pending redemption was removed
        let pending_count_after = mock_clo_exchange_advanced::get_pending_redemption_count();
        assert!(pending_count_after == 0, E_INCORRECT_PENDING_COUNT);
        
        // Check investor received underlying tokens
        // With dynamic pricing: NAV=10M, Supply after issuance=6, Price=10M/6=1_666_666
        let dynamic_price = price_per_share / 6; // 10_000_000 / 6 = 1_666_666
        let expected_redemption_amount = 2 * dynamic_price; // 2 * 1_666_666 = 3_333_332
        let underlying_balance_after_approval = primary_fungible_store::balance(signer::address_of(&investor), underlying_obj);
        let expected_balance = underlying_amount_total - issuance_amount + expected_redemption_amount;
        assert!(underlying_balance_after_approval == expected_balance, E_INCORRECT_UNDERLYING_BALANCE_AFTER_REDEMPTION);
        
        // Check admin balance decreased
        let admin_addr = mock_clo_exchange_advanced::get_admin_address();
        let admin_balance_after = primary_fungible_store::balance(admin_addr, underlying_obj);
        assert!(admin_balance_after == issuance_amount - expected_redemption_amount, E_INCORRECT_ADMIN_BALANCE);
    }

    #[test(admin = @mock_clo, investor = @0x2)]
    fun test_admin_reject_redemption(admin: signer, investor: signer) acquires USDCInfo {
        let underlying_amount_total = 100_000_000u64;
        let price_per_share = 10_000_000u64;
        let (underlying_obj, share_obj, _) = setup(&admin, &investor, underlying_amount_total, price_per_share, 3);
        
        // Issue shares
        let issuance_amount = 30_000_000u64; // 3 shares
        mock_clo_exchange_advanced::request_issuance(&investor, share_obj, issuance_amount);
        
        // Request redemption
        mock_clo_exchange_advanced::request_redemption(&investor, share_obj, 1); // 1 share
        
        // Check shares were burned
        let share_balance_after_request = primary_fungible_store::balance(signer::address_of(&investor), share_obj);
        assert!(share_balance_after_request == 2, E_INCORRECT_SHARE_BALANCE);
        
        // Admin rejects redemption (request_id = 1)
        mock_clo_exchange_advanced::reject_redemption(&admin, 1);
        
        // Check pending redemption was removed
        let pending_count_after = mock_clo_exchange_advanced::get_pending_redemption_count();
        assert!(pending_count_after == 0, E_INCORRECT_PENDING_COUNT);
        
        // Check shares were re-minted to investor
        let share_balance_after_rejection = primary_fungible_store::balance(signer::address_of(&investor), share_obj);
        assert!(share_balance_after_rejection == 3, E_INCORRECT_SHARE_BALANCE_AFTER_REDEMPTION);
        
        // Check investor did not receive underlying tokens
        let underlying_balance_after_rejection = primary_fungible_store::balance(signer::address_of(&investor), underlying_obj);
        assert!(underlying_balance_after_rejection == underlying_amount_total - issuance_amount, E_INCORRECT_UNDERLYING_BALANCE);
    }

    #[test(admin = @mock_clo, investor = @0x2)]
    fun test_multiple_pending_redemptions(admin: signer, investor: signer) acquires USDCInfo {
        let underlying_amount_total = 100_000_000u64;
        let price_per_share = 10_000_000u64;
        let (_, share_obj, _) = setup(&admin, &investor, underlying_amount_total, price_per_share, 4);
        
        // Issue shares
        let issuance_amount = 50_000_000u64; // 5 shares
        mock_clo_exchange_advanced::request_issuance(&investor, share_obj, issuance_amount);
        
        // Request multiple redemptions
        mock_clo_exchange_advanced::request_redemption(&investor, share_obj, 1); // request_id = 1
        mock_clo_exchange_advanced::request_redemption(&investor, share_obj, 2); // request_id = 2
        mock_clo_exchange_advanced::request_redemption(&investor, share_obj, 1); // request_id = 3
        
        // Check multiple pending redemptions
        let pending_count = mock_clo_exchange_advanced::get_pending_redemption_count();
        assert!(pending_count == 3, E_INCORRECT_PENDING_COUNT);
        
        // Check next request ID
        let next_id = mock_clo_exchange_advanced::get_next_request_id();
        assert!(next_id == 4, E_INCORRECT_REQUEST_ID);
        
        // Check all shares were burned
        let share_balance = primary_fungible_store::balance(signer::address_of(&investor), share_obj);
        assert!(share_balance == 1, E_INCORRECT_SHARE_BALANCE); // 5 - 1 - 2 - 1 = 1
        
        // Approve middle request
        mock_clo_exchange_advanced::approve_redemption(&admin, 2);
        
        // Check pending count decreased
        let pending_count_after = mock_clo_exchange_advanced::get_pending_redemption_count();
        assert!(pending_count_after == 2, E_INCORRECT_PENDING_COUNT);
    }

    #[test(admin = @mock_clo, investor = @0x2)]
    fun test_batch_approve_redemptions(admin: signer, investor: signer) acquires USDCInfo {
        let underlying_amount_total = 100_000_000u64;
        let price_per_share = 10_000_000u64;
        let (underlying_obj, share_obj, _) = setup(&admin, &investor, underlying_amount_total, price_per_share, 5);
        
        // Issue shares
        let issuance_amount = 50_000_000u64; // 5 shares
        mock_clo_exchange_advanced::request_issuance(&investor, share_obj, issuance_amount);
        
        // Request multiple redemptions
        mock_clo_exchange_advanced::request_redemption(&investor, share_obj, 1); // request_id = 1
        mock_clo_exchange_advanced::request_redemption(&investor, share_obj, 2); // request_id = 2
        mock_clo_exchange_advanced::request_redemption(&investor, share_obj, 1); // request_id = 3
        
        // Batch approve all redemptions
        let request_ids = vector[1u64, 2u64, 3u64];
        mock_clo_exchange_advanced::batch_approve_redemptions(&admin, request_ids);
        
        // Check all pending redemptions were processed
        let pending_count_after = mock_clo_exchange_advanced::get_pending_redemption_count();
        assert!(pending_count_after == 0, E_INCORRECT_PENDING_COUNT);
        
        // Check investor received all underlying tokens
        // With dynamic pricing, each redemption request burns shares, changing the price:
        // Request 1 (1 share): Price = 10M/6 = 1_666_666, Amount = 1_666_666
        // Request 2 (2 shares): Price = 10M/5 = 2_000_000, Amount = 4_000_000  
        // Request 3 (1 share): Price = 10M/3 = 3_333_333, Amount = 3_333_333
        let expected_redemption_amount = 1_666_666 + 4_000_000 + 3_333_333; // = 8_999_999
        let underlying_balance_after = primary_fungible_store::balance(signer::address_of(&investor), underlying_obj);
        let expected_balance = underlying_amount_total - issuance_amount + expected_redemption_amount;
        assert!(underlying_balance_after == expected_balance, E_INCORRECT_UNDERLYING_BALANCE_AFTER_REDEMPTION);
    }

    #[test(admin = @mock_clo, investor1 = @0x2, investor2 = @0x3)]
    fun test_multiple_investors_pending_redemptions(admin: signer, investor1: signer, investor2: signer) acquires USDCInfo {
        let underlying_amount = 100_000_000u64;
        let price_per_share = 10_000_000u64;
        
        // Setup for investor1
        let (underlying_obj, share_obj, _) = setup(&admin, &investor1, underlying_amount, price_per_share, 6);
        
        // Mint USDC to investor2
        let investor2_addr = signer::address_of(&investor2);
        mint_usdc_to(&admin, underlying_amount, investor2_addr);
        
        // Both investors issue shares
        mock_clo_exchange_advanced::request_issuance(&investor1, share_obj, 30_000_000u64); // 3 shares
        mock_clo_exchange_advanced::request_issuance(&investor2, share_obj, 20_000_000u64); // 8 shares (price changes!)
        
        // Both investors request redemptions
        mock_clo_exchange_advanced::request_redemption(&investor1, share_obj, 1); // request_id = 1
        mock_clo_exchange_advanced::request_redemption(&investor2, share_obj, 2); // request_id = 2
        
        // Check pending redemptions
        let pending_count = mock_clo_exchange_advanced::get_pending_redemption_count();
        assert!(pending_count == 2, E_INCORRECT_PENDING_COUNT);
        
        // Approve investor1's redemption, reject investor2's
        mock_clo_exchange_advanced::approve_redemption(&admin, 1);
        mock_clo_exchange_advanced::reject_redemption(&admin, 2);
        
        // Check no pending redemptions left
        let pending_count_final = mock_clo_exchange_advanced::get_pending_redemption_count();
        assert!(pending_count_final == 0, E_INCORRECT_PENDING_COUNT);
        
        // Check investor1 received underlying tokens
        // Dynamic pricing calculation:
        // Initial: NAV=10M, Supply=1
        // After investor1 issuance (30M): Supply=1+3=4, Price=10M/4=2_500_000
        // After investor2 issuance (20M): Supply=4+8=12, Price=10M/12=833_333
        // Redemption: 1 share at price 833_333
        let final_dynamic_price = price_per_share / 12; // 10_000_000 / 12 = 833_333
        let investor1_balance = primary_fungible_store::balance(signer::address_of(&investor1), underlying_obj);
        let expected_investor1_balance = underlying_amount - 30_000_000u64 + final_dynamic_price; // issued 30M, redeemed 833_333
        assert!(investor1_balance == expected_investor1_balance, E_INCORRECT_UNDERLYING_BALANCE);
        
        // Check investor2 got shares back (originally had 8, redeemed 2, should have 8 again)
        let investor2_share_balance = primary_fungible_store::balance(investor2_addr, share_obj);
        assert!(investor2_share_balance == 8, E_INCORRECT_SHARE_BALANCE_AFTER_REDEMPTION); // Shares were re-minted
        
        // Check investor2 did not receive underlying tokens
        let investor2_balance = primary_fungible_store::balance(investor2_addr, underlying_obj);
        assert!(investor2_balance == underlying_amount - 20_000_000u64, E_INCORRECT_UNDERLYING_BALANCE); // Only issued, no redemption
    }

    #[test(admin = @mock_clo, investor = @0x2)]
    fun test_view_functions(admin: signer, investor: signer) acquires USDCInfo {
        let underlying_amount_total = 100_000_000u64;
        let price_per_share = 10_000_000u64;
        let (_, share_obj, _) = setup(&admin, &investor, underlying_amount_total, price_per_share, 7);
        
        // Test admin address view
        let admin_addr = mock_clo_exchange_advanced::get_admin_address();
        assert!(admin_addr == @mock_clo, E_INCORRECT_ADMIN_BALANCE);
        
        // Test vault address view (should be same as admin)
        let vault_addr = mock_clo_exchange_advanced::get_admin_vault_address();
        assert!(vault_addr == admin_addr, E_INCORRECT_ADMIN_BALANCE);
        
        // Test exchange price view
        let share_addr = object::object_address(&share_obj);
        let retrieved_price = mock_clo_exchange_advanced::get_current_price_per_share(share_obj);
        assert!(retrieved_price == price_per_share, E_INCORRECT_UNDERLYING_BALANCE);
        
        // Test underlying metadata view
        let usdc_addr = get_usdc_metadata_addr(&admin);
        let retrieved_underlying = mock_clo_exchange_advanced::underlying_metadata(share_addr);
        assert!(retrieved_underlying == usdc_addr, E_INCORRECT_UNDERLYING_BALANCE);
        
        // Test pending redemption views
        let initial_count = mock_clo_exchange_advanced::get_pending_redemption_count();
        assert!(initial_count == 0, E_INCORRECT_PENDING_COUNT);
        
        let initial_next_id = mock_clo_exchange_advanced::get_next_request_id();
        assert!(initial_next_id == 1, E_INCORRECT_REQUEST_ID);
        
        // Issue and request redemption
        mock_clo_exchange_advanced::request_issuance(&investor, share_obj, 20_000_000u64);
        mock_clo_exchange_advanced::request_redemption(&investor, share_obj, 1);
        
        // Test updated views
        let updated_count = mock_clo_exchange_advanced::get_pending_redemption_count();
        assert!(updated_count == 1, E_INCORRECT_PENDING_COUNT);
        
        let updated_next_id = mock_clo_exchange_advanced::get_next_request_id();
        assert!(updated_next_id == 2, E_INCORRECT_REQUEST_ID);
        
        // Test get pending redemptions
        let pending_redemptions = mock_clo_exchange_advanced::get_pending_redemptions();
        assert!(vector::length(&pending_redemptions) == 1, E_INCORRECT_PENDING_COUNT);
    }

    #[test(admin = @mock_clo, investor = @0x2)]
    fun test_admin_update_exchange_rate(admin: signer, investor: signer) acquires USDCInfo {
        let underlying_amount_total = 100_000_000u64;
        let initial_price_per_share = 10_000_000u64; // 10 USDC per share
        let (underlying_obj, share_obj, _) = setup(&admin, &investor, underlying_amount_total, initial_price_per_share, 8);
        
        // Check initial exchange rate
        // let share_addr = object::object_address(&share_obj);
        let initial_rate = mock_clo_exchange_advanced::get_current_price_per_share(share_obj);
        assert!(initial_rate == initial_price_per_share, E_INCORRECT_UNDERLYING_BALANCE);
        
        // Issue shares at initial rate
        let issuance_amount = 30_000_000u64; // 3 shares at 10M per share
        mock_clo_exchange_advanced::request_issuance(&investor, share_obj, issuance_amount);
        
        let initial_share_balance = primary_fungible_store::balance(signer::address_of(&investor), share_obj);
        assert!(initial_share_balance == 3, E_INCORRECT_SHARE_BALANCE);
        
        // Admin updates exchange rate to 20M per share (double the price)
        let new_price_per_share = 20_000_000u64;
        mock_clo_exchange_advanced::update_exchange_rate(&admin, share_obj, new_price_per_share);
        
        // Verify the exchange rate was updated
        // After updating NAV to 20M and supply is 4 shares: Price = 20M/4 = 5_000_000
        let expected_updated_rate = new_price_per_share / 4; // 20_000_000 / 4 = 5_000_000
        let updated_rate = mock_clo_exchange_advanced::get_current_price_per_share(share_obj);
        assert!(updated_rate == expected_updated_rate, E_INCORRECT_UNDERLYING_BALANCE);
        
        // Also verify through the view function
        let current_price = mock_clo_exchange_advanced::get_current_price_per_share(share_obj);
        assert!(current_price == expected_updated_rate, E_INCORRECT_UNDERLYING_BALANCE);
        
        // Test issuance at new rate - at price 5M per share, 40M should buy 8 shares
        let second_issuance = 40_000_000u64;
        mock_clo_exchange_advanced::request_issuance(&investor, share_obj, second_issuance);
        
        let shares_from_second_issuance = second_issuance / expected_updated_rate; // 40M / 5M = 8 shares
        let final_share_balance = primary_fungible_store::balance(signer::address_of(&investor), share_obj);
        assert!(final_share_balance == 3 + shares_from_second_issuance, E_INCORRECT_SHARE_BALANCE); // 3 + 8 = 11 shares
        
        // Test redemption at new rate - 1 share at current dynamic price
        mock_clo_exchange_advanced::request_redemption(&investor, share_obj, 1);
        mock_clo_exchange_advanced::approve_redemption(&admin, 1);
        
        // Check investor received underlying tokens
        // After second issuance: Supply = 4 + 8 = 12, NAV = 20M, Price = 20M/12 = 1_666_666
        let final_dynamic_price = new_price_per_share / 12; // 20_000_000 / 12 = 1_666_666
        let final_underlying_balance = primary_fungible_store::balance(signer::address_of(&investor), underlying_obj);
        let expected_balance = underlying_amount_total - issuance_amount - second_issuance + final_dynamic_price;
        assert!(final_underlying_balance == expected_balance, E_INCORRECT_UNDERLYING_BALANCE_AFTER_REDEMPTION);
    }

    #[test(admin = @mock_clo, non_admin = @0x999)]
    #[expected_failure(abort_code = 1, location = mock_clo::mock_clo_exchange_advanced)]
    fun test_non_admin_cannot_update_exchange_rate(admin: signer, non_admin: signer) acquires USDCInfo {
        let underlying_amount_total = 100_000_000u64;
        let price_per_share = 10_000_000u64;
        let (_, share_obj, _) = setup(&admin, &non_admin, underlying_amount_total, price_per_share, 9);
        
        // Non-admin tries to update exchange rate - should fail
        mock_clo_exchange_advanced::update_exchange_rate(&non_admin, share_obj, 20_000_000u64);
    }

    #[test(admin = @mock_clo, investor = @0x2)]
    #[expected_failure(abort_code = 4, location = mock_clo::mock_clo_exchange_advanced)]
    fun test_cannot_set_zero_exchange_rate(admin: signer, investor: signer) acquires USDCInfo {
        let underlying_amount_total = 100_000_000u64;
        let price_per_share = 10_000_000u64;
        let (_, share_obj, _) = setup(&admin, &investor, underlying_amount_total, price_per_share, 10);
        
        // Admin tries to set exchange rate to 0 - should fail
        mock_clo_exchange_advanced::update_exchange_rate(&admin, share_obj, 0);
    }


} 