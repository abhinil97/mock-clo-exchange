script {
    //use mock_clo::mock_clo_exchange;

    // Developers should modify the constants below before publishing and running.
    const NAME: vector<u8> = b"Tiberia Fund #2";
    const SYMBOL: vector<u8> = b"TIB2";
    const DECIMALS: u8 = 6;
    const UNDERLYING_TOKEN_ADDR: address = @0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b;
    const EXCHANGE_PRICE: u64 = 1000000; // underlying units per share
    const MAX_SUPPLY: u128 = 1000000000000;  // 0 for unlimited

    fun main(admin: &signer) {
        

        mock_clo::mock_clo_exchange::create_share_class(
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