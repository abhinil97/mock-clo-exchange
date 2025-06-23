# Mock CLO Exchange - Upgrade Guide

## Overview
This guide explains how to upgrade the Mock CLO Exchange module on Aptos while maintaining compatibility and minimizing disruption.

## Key Upgrade-Friendly Design Features

### 1. Events Architecture
- All events use the `#[event]` attribute (Aptos v2 events)
- Events have `drop` and `store` abilities for flexibility
- Events are emitted but not stored in resources, making them upgrade-safe
- New events can be added without breaking existing functionality

### 2. Resource Structure
- Resources are stored under object addresses, not the module address
- `ShareClassData` is stored under each share class's metadata object
- `ProtocolConfig` is the only resource stored under the module address
- This design allows adding new fields to resources in future upgrades

### 3. Function Design
- All public functions are marked as `entry` for direct invocation
- View functions are properly marked with `#[view]`
- Functions use `acquires` declarations for clarity

## Upgrade Process

### Step 1: Prepare the New Version
```bash
# 1. Make your changes to the module
# 2. Ensure backward compatibility
# 3. Test thoroughly
aptos move test
```

### Step 2: Compile the New Version
```bash
aptos move compile --save-metadata
```

### Step 3: Publish the Upgrade
```bash
# For mainnet
aptos move publish --profile lucid --upgrade-policy compatible

# For testnet/devnet
aptos move publish --upgrade-policy compatible
```

## Upgrade Policies

### Compatible (Recommended)
- Allows adding new functions
- Allows adding new structs/resources
- Allows adding new events
- Cannot remove or modify existing function signatures
- Cannot remove or modify existing struct fields

### Immutable
- No upgrades allowed
- Use only for final, audited versions

## Safe Upgrade Patterns

### ✅ Adding New Functions
```move
// Safe to add
public entry fun new_feature(admin: &signer) {
    // New functionality
}
```

### ✅ Adding New Events
```move
// Safe to add
#[event]
struct NewFeatureActivated has drop, store {
    feature_id: u64,
    timestamp: u64,
}
```

### ✅ Adding New View Functions
```move
// Safe to add
#[view]
public fun get_new_data(): u64 {
    // Return data
}
```

### ❌ Unsafe Changes (Will Fail)
```move
// Cannot change function signatures
public entry fun existing_function(new_param: u64) { } // FAILS

// Cannot remove functions
// Removing any existing function will fail

// Cannot modify struct fields
struct ExistingStruct has key {
    existing_field: u64,
    // new_field: u64, // Can only add if using compatible upgrade
}
```

## Testing Upgrades

### Local Testing
```bash
# 1. Deploy initial version to local network
aptos move publish --profile local

# 2. Make changes
# 3. Test upgrade
aptos move publish --profile local --upgrade-policy compatible
```

### Devnet Testing
```bash
# Always test on devnet first
aptos move publish --profile default --upgrade-policy compatible
```

## Event Monitoring

### Listening to Events
The module emits these events:
- `ShareClassCreated`: When a new share class is created
- `SharesIssued`: When shares are minted
- `SharesRedeemed`: When shares are burned
- `PriceUpdated`: When admin updates the price

### Event Structure Example
```typescript
// TypeScript SDK example
const events = await aptosClient.getEventsByEventHandle(
    moduleAddress,
    "mock_clo::mock_clo_exchange::SharesIssued"
);
```

## Best Practices

1. **Version Control**: Tag each deployed version in git
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **Documentation**: Update README with changes for each version

3. **Testing**: Always test upgrades on devnet before mainnet

4. **Monitoring**: Set up event monitoring before upgrading

5. **Rollback Plan**: Keep previous version bytecode for emergency

## Emergency Procedures

### If Upgrade Fails
1. Check error message for compatibility issues
2. Revert code changes causing issues
3. Re-compile and try again

### If Bugs Found Post-Upgrade
1. Prepare hotfix following upgrade policies
2. Test thoroughly on devnet
3. Deploy with `compatible` policy

## Version History

### v1.0.0 (Current)
- Initial deployment
- Basic share class creation
- Issuance and redemption
- Price updates by admin
- Comprehensive event emission

### Future Versions (Planned)
- v1.1.0: Add pause/unpause functionality
- v1.2.0: Add fee mechanism
- v1.3.0: Add multi-sig admin support

## Resources

- [Aptos Upgrade Policies](https://aptos.dev/en/build/smart-contracts/deployment#upgrading-a-package)
- [Aptos Events Documentation](https://aptos.dev/en/build/smart-contracts/events)
- [Move Best Practices](https://aptos.dev/en/build/smart-contracts/move-security-guidelines) 