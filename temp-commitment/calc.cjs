const { buildPoseidon } = require("circomlibjs");

async function main() {
    const poseidon = await buildPoseidon();
    
    // Must match circuit: hash_2([donor_secret, amount_field])
    const donor_secret = BigInt("12345678901234567890123456789012");
    const donation_amount = 10000n;
    
    // Circuit does: hash_2([donor_secret, amount_field])
    const hash = poseidon([donor_secret, donation_amount]);
    const commitment = poseidon.F.toString(hash);
    
    console.log(commitment);
}

main();
