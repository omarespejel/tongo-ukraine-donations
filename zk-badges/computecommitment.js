const { buildPoseidon } = require("circomlibjs");

async function main() {
    const poseidon = await buildPoseidon();
    
    const donation_amount = 10000n;
    const donor_secret = BigInt("12345678901234567890123456789012");
    
    const hash = poseidon([donation_amount, donor_secret]);
    const commitment = poseidon.F.toString(hash);
    
    console.log(commitment);
}

main();
