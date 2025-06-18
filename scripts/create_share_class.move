script {
    use mock_clo::mock_clo_exchange;

    // Developers should modify the constants below before publishing and running.
    const NAME: vector<u8> = b"Class A";
    const SYMBOL: vector<u8> = b"CLA";
    const DECIMALS: u8 = 8;
    const UNDERLYING_TOKEN_ADDR: address = @0xdeadbeef;
    const EXCHANGE_PRICE: u64 = 10_000_000; // underlying units per share
    const MAX_SUPPLY: u128 = 1_000_000;  // 0 for unlimited

    fun main(admin: &signer) {
        

        mock_clo_exchange::create_share_class(
            admin,
            NAME,
            SYMBOL,
            DECIMALS,
            UNDERLYING_TOKEN_ADDR,
            EXCHANGE_PRICE,
            MAX_SUPPLY,
        );
    }
} 