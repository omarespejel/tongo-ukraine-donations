use core::array::{ArrayTrait, Span};
use core::integer::u256;
use core::option::Option;
use starknet::ContractAddress;

#[starknet::interface]
pub trait IDonationBadge<TContractState> {
    fn claim_badge(
        ref self: TContractState,
        full_proof_with_hints: Span<felt252>,
        threshold: u256,
        donation_commitment: u256,
        badge_tier: u8,
    ) -> bool;
    fn has_badge(self: @TContractState, address: ContractAddress, tier: u8) -> bool;
    fn get_badge_tier(self: @TContractState, address: ContractAddress) -> u8;
    fn is_commitment_used(self: @TContractState, commitment: u256) -> bool;
    fn get_badge_counts(self: @TContractState) -> (u64, u64, u64);
}

#[starknet::interface]
pub trait IHonkVerifier<TContractState> {
    fn verify_ultra_keccak_honk_proof(
        self: @TContractState, full_proof_with_hints: Span<felt252>,
    ) -> Option<Span<u256>>;
}

#[starknet::contract]
pub mod DonationBadge {
    use super::{
        ArrayTrait, ContractAddress, IDonationBadge, IHonkVerifierDispatcher,
        IHonkVerifierDispatcherTrait, Span,
    };
    use core::array::SpanTrait;
    use core::integer::u256;
    use core::option::OptionTrait;
    use core::traits::TryInto;
    use starknet::get_caller_address;
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess,
    };

    // FIX: Use felt252 max (2^251 - 1) instead of u256 max
    const FELT252_MASK_LOW: u128 = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;
    const FELT252_MASK_HIGH: u128 = 0x07FFFFFFFFFFFFFFFFFFFFFFFFFFFFFF; // 2^123 - 1 for high bits

    #[storage]
    struct Storage {
        badges: Map<ContractAddress, u8>,
        used_commitments: Map<felt252, bool>,
        total_bronze: u64,
        total_silver: u64,
        total_gold: u64,
        verifier_contract: ContractAddress,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        BadgeClaimed: BadgeClaimed,
    }

    #[derive(Drop, starknet::Event)]
    pub struct BadgeClaimed {
        #[key]
        recipient: ContractAddress,
        tier: u8,
        commitment_hash: felt252,
    }

    #[constructor]
    fn constructor(ref self: ContractState, verifier: ContractAddress) {
        self.verifier_contract.write(verifier);
    }

    #[abi(embed_v0)]
    impl DonationBadgeImpl of IDonationBadge<ContractState> {
        fn claim_badge(
            ref self: ContractState,
            full_proof_with_hints: Span<felt252>,
            threshold: u256,
            donation_commitment: u256,
            badge_tier: u8,
        ) -> bool {
            let caller = get_caller_address();

            // FIX: Just use the low 128 bits as the storage key (unique enough)
            let commitment_key: felt252 = donation_commitment.low.into();

            assert(!self.used_commitments.read(commitment_key), 'Commitment already used');
            assert(badge_tier >= 1_u8 && badge_tier <= 3_u8, 'Invalid badge tier');

            let verifier_address = self.verifier_contract.read();
            let dispatcher = IHonkVerifierDispatcher { contract_address: verifier_address };
            let verification_result = dispatcher.verify_ultra_keccak_honk_proof(full_proof_with_hints);
            assert(verification_result.is_some(), 'Proof verification failed');

            let public_inputs = verification_result.unwrap();
            assert(public_inputs.len() >= 3, 'Missing public inputs');

            let verified_threshold = *public_inputs.at(0);
            let verified_commitment = *public_inputs.at(1);
            let verified_tier_u256 = *public_inputs.at(2);
            let verified_tier: u8 = verified_tier_u256.low.try_into().expect('Tier conversion failed');

            assert(verified_threshold == threshold, 'Threshold mismatch');
            assert(verified_commitment == donation_commitment, 'Commitment mismatch');
            assert(verified_tier == badge_tier, 'Tier mismatch');

            self.used_commitments.write(commitment_key, true);

            let current_tier = self.badges.read(caller);
            if badge_tier > current_tier {
                self.badges.write(caller, badge_tier);
                if badge_tier == 1_u8 {
                    self.total_bronze.write(self.total_bronze.read() + 1);
                } else if badge_tier == 2_u8 {
                    self.total_silver.write(self.total_silver.read() + 1);
                } else if badge_tier == 3_u8 {
                    self.total_gold.write(self.total_gold.read() + 1);
                }
            }

            self.emit(Event::BadgeClaimed(BadgeClaimed {
                recipient: caller,
                tier: badge_tier,
                commitment_hash: commitment_key,
            }));
            true
        }

        fn has_badge(self: @ContractState, address: ContractAddress, tier: u8) -> bool {
            self.badges.read(address) >= tier
        }

        fn get_badge_tier(self: @ContractState, address: ContractAddress) -> u8 {
            self.badges.read(address)
        }

        fn is_commitment_used(self: @ContractState, commitment: u256) -> bool {
            let commitment_key: felt252 = commitment.low.into();
            self.used_commitments.read(commitment_key)
        }

        fn get_badge_counts(self: @ContractState) -> (u64, u64, u64) {
            (
                self.total_bronze.read(),
                self.total_silver.read(),
                self.total_gold.read(),
            )
        }
    }
}
