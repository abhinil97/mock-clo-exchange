// Template for creating share class
// Name
// Symbol
// decimals
// underlying token address
// Price
// max supply

// icon: ?

const usdc_addr = "0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b";
const admin_addr = "0xc09d9f882bcd2a8f109d806eae6aa3e1d8f630b18a196142bf6d9b2a4292b092";

const assets = {
    asset1: {
        name: "Tiberia Fund #2",
        symbol: "TIB2",
        decimals: 6,
        underlying_token_addr: "0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b",
        price: 1, // 1USDC per share
        max_supply: 1000_000_000_000,
        icon: "https://drive.google.com/file/d/1Cy7cWbaSoPgYUYRRvqE6PaQhCTzszfCe/view?usp=sharing",
        module: "0x95262b5eed8051a286ae7f3f86cc6db07c152da2806ccff31df5a475c500b591"
    },
    asset2: {
        name: "BSFG 3/25 Bond",
        symbol: "BSFG 3/25",
        decimals: 6,
        underlying_token_addr: "0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b",
        price: 5, // 0.05 USDC per share
        max_supply: 500_000_000_000,   
        icon: "https://drive.google.com/file/d/1kkajKeYjIglNYcxPiWU82aYFtDikNRPt/view?usp=sharing",
        module: "0xcca9bd387945b1daf7bb6cc6d68796318036ccc109be0ca31f6ae6d9c898d89e"
    },
    asset3: {
        name: "Roda Deal #1",
        symbol: "RODA1",
        decimals: 6,
        underlying_token_addr: "0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b",
        price: 3, // 0.3 USDC per share
        max_supply: 300_000_000_000,
        icon: "https://drive.google.com/file/d/1-ZkUZUji7ynL3AJa4rukP8SarbPZVI-N/view?usp=sharing",
        module: "0xdbad8fb3e984a1bf2253eb5621a9e8371e3e52bcd4f54500e8a4059b6053198e"
    },
}
