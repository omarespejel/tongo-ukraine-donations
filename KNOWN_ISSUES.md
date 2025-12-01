# Known Issues

## RESOLVED: "NowOwner" Error

**Status**: Fixed

**Resolution Date**: November 27, 2024

**Root Cause**: SDK version mismatch with contract deployment

The "NowOwner" error was caused by using Tongo SDK v1.3.0 (released Nov 14) with the old Tongo contract address from August 27. The SDK v1.3.0 is only compatible with contracts deployed on or after November 14, 2024.

**Solution**: Updated mainnet contract address to the new deployment.

- **Old contract**: `0x0415f2c3b16cc43856a0434ed151888a5797b6a22492ea6fd41c62dbb4df4e6c` (Aug 27, deprecated)
- **New contract**: `0x72098b84989a45cc00697431dfba300f1f5d144ae916e98287418af4e548d96` (Nov 14, current)

**Files Updated**:
- `src/wallet-config.ts` - Updated mainnet contract address
- `README.md` - Updated documentation with new address

**Verification**: After updating the contract address, funding operations on mainnet should work correctly without "NowOwner" errors.

---

## Address Format Handling

**Status**: Addressed in code

**Issue**: Starknet addresses can be 65 or 66 characters (with or without leading zero). The Tongo SDK converts addresses to numbers for calldata, which can lose leading zeros.

**Solution**: The code includes automatic address padding and calldata patching:
- `padAddress()` function ensures consistent 66-character format
- Approve calldata is automatically patched if spender address doesn't match
- Wallet addresses are used in their original format for SDK calls to match transaction sender

**Files**: `src/tongo-service.ts` - Address padding and calldata patching logic

---

## Large Bundle Size Warning

**Status**: Expected behavior

**Issue**: Vite build shows warning about chunks larger than 500 KB after minification.

**Details**: The main bundle (`index.js`) is ~967 KB (281 KB gzipped) due to:
- Tongo SDK inclusion
- Starknet.js library
- ZK proof generation dependencies

**Impact**: None - this is expected for a ZK proof library. The bundle is still reasonable for a web application.

**Mitigation**: Consider code splitting if bundle size becomes a concern, though current size is acceptable for most use cases.

---

## Node.js Version Warning

**Status**: Non-blocking

**Issue**: Vite shows warning about Node.js version when using Bun.

**Details**: Vite recommends Node.js 20.19+ or 22.12+, but Bun works fine with this project.

**Impact**: None - Bun handles TypeScript and module resolution correctly. The warning can be ignored.

---

## Browser Compatibility

**Status**: Tested

**Supported Browsers**:
- Chrome/Chromium (Braavos, Argent X)
- Firefox (Braavos, Argent X)
- Edge (Braavos, Argent X)

**Requirements**:
- Web Crypto API support (all modern browsers)
- localStorage support (all modern browsers)
- Wallet extension installed (Braavos or Argent X)

**Known Limitations**:
- Safari may have limited wallet extension support
- Mobile browsers require wallet apps, not extensions



