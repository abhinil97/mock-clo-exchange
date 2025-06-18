script {
    use mock_clo::mock_clo_exchange;
    use aptos_framework::object;
    use aptos_framework::fungible_asset::Metadata;

    /// Investor returns `redemption_amount` of shares for redemption.
    fun main(
        investor: &signer,
        share_metadata_addr: address,
        redemption_amount: u64,
    ) {
        let share_class = object::address_to_object<Metadata>(share_metadata_addr);
        mock_clo_exchange::request_redemption(
            investor,
            share_class,
            redemption_amount,
        );
    }
} 