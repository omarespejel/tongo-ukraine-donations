# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Private Key Management

### Tongo Private Key
- **Storage**: Automatically generated and stored in browser `localStorage`
- **Generation**: Uses Web Crypto API (browser) or Node.js crypto module
- **Validation**: Ensures keys are valid Stark curve scalars
- **Backup**: Users should backup their Tongo key from the UI modal
- **Recovery**: If lost, the Tongo account balance cannot be recovered

### Starknet Private Key
- **Storage**: Never stored in browser - handled by wallet extensions (Braavos/Argent X)
- **Security**: Wallet extensions manage key security and signing
- **Best Practice**: Use hardware wallets for large amounts

## Known Security Issues

### Address Format Sensitivity
- **Issue**: Addresses must be consistently formatted (65 vs 66 characters)
- **Impact**: Can cause "NowOwner" errors if addresses don't match
- **Mitigation**: Code includes address padding logic to ensure consistency
- **Status**: Addressed in code with `padAddress()` function

### SDK Address Conversion
- **Issue**: Tongo SDK converts addresses to numbers, losing leading zeros
- **Impact**: Approve calls may fail with "NowOwner" error
- **Mitigation**: Code patches approve calldata to use correct padded addresses
- **Status**: Addressed with automatic calldata patching

## Reporting Security Vulnerabilities

**Please do NOT open public GitHub issues for security vulnerabilities.**

If you discover a security vulnerability, please email: [your-email@example.com]

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will respond within 48 hours and work with you to address the issue.

## Security Best Practices

1. **Use Testnet for Testing**
   - Always test on Sepolia testnet before using mainnet
   - Testnet tokens have no real value

2. **Never Share Private Keys**
   - Never commit private keys to git
   - Never share keys in public channels
   - Use environment variables for CLI usage

3. **Verify Contract Addresses**
   - Always verify Tongo contract addresses before use
   - Check network configuration matches your intended network
   - Mainnet and testnet use different contract addresses

4. **Check RPC URLs**
   - Verify RPC URLs in `wallet-config.ts` are correct
   - Use your own Alchemy API key (don't share keys)
   - Monitor RPC usage to detect unauthorized access

5. **Backup Your Tongo Key**
   - Always backup your Tongo private key when generated
   - Store backups securely (encrypted storage recommended)
   - Losing the key means losing access to encrypted balance

6. **Verify Transactions**
   - Always verify transaction details before signing
   - Check recipient addresses carefully
   - Verify amounts match your intentions

7. **Keep Dependencies Updated**
   - Regularly update `@fatsolutions/tongo-sdk`
   - Update `starknet.js` for security patches
   - Review dependency security advisories

## Environment Variables Security

- **Never commit `.env` files** - Already in `.gitignore`
- **Use `.env.example`** - Template without real values
- **Rotate API keys** - If exposed, immediately rotate
- **Use separate keys** - Different keys for testnet and mainnet

## Wallet Security

- **Use Official Wallets Only**: Braavos or Argent X
- **Verify Extension**: Check extension is from official source
- **Hardware Wallets**: Consider hardware wallets for large amounts
- **Phishing Protection**: Always verify URLs before connecting

## Code Security

- **No Hardcoded Secrets**: All sensitive data uses environment variables
- **Input Validation**: All user inputs are validated
- **Error Handling**: Errors don't expose sensitive information
- **Debug Logging**: Sensitive values are masked in logs

## Audit Status

This project has not undergone a formal security audit. Use at your own risk.

For production use, consider:
- Professional security audit
- Bug bounty program
- Formal verification of critical paths



