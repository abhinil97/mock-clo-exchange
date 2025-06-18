script {
    use mock_clo::mock_clo_exchange;
    use aptos_framework::object;
    use aptos_framework::fungible_asset::Metadata;

    /// Investor deposits `underlying_amount` of the underlying to request new shares.
    ///
    /// `share_metadata_addr` and `underlying_metadata_addr` are the addresses of the respective
    /// `Metadata` objects on-chain.
    fun main(
        investor: &signer,
        share_metadata_addr: address,
        underlying_amount: u64,
    ) {
        let share_class = object::address_to_object<Metadata>(share_metadata_addr);
        mock_clo_exchange::request_issuance(
            investor,
            share_class,
            underlying_amount,
        );
    }
} 