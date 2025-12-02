// src/badge-service.ts
// Donation Badge Service - handles proof generation + Starknet interaction

import { Account, Contract, RpcProvider } from 'starknet';
import { getContractAddress } from './deployments';

export enum BadgeTier {
  NONE = 0,
  BRONZE = 1,
  SILVER = 2,
  GOLD = 3,
}

const BADGE_CONTRACT_ADDRESS: Record<'mainnet' | 'sepolia', string> = {
  mainnet: getContractAddress('mainnet', 'DonationBadge'),
  sepolia: getContractAddress('sepolia', 'DonationBadge'),
};

const BADGE_ABI = [
  {
    name: 'claim_badge',
    type: 'function',
    inputs: [
      { name: 'full_proof_with_hints', type: 'core::array::Span::re::felt252>' },
      { name: 'threshold', type: 'core::integer::u256' },
      { name: 'donation_commitment', type: 'core::integer::u256' },
      { name: 'badge_tier', type: 'core::integer::u8' },
    ],
    outputs: [{ type: 'core::bool' }],
  },
  {
    name: 'has_badge',
    type: 'function',
    inputs: [
      { name: 'address', type: 'core::starknet::contract_address::ContractAddress' },
      { name: 'tier', type: 'core::integer::u8' },
    ],
    outputs: [{ type: 'core::bool' }],
    state_mutability: 'view',
  },
  {
    name: 'get_badge_tier',
    type: 'function',
    inputs: [{ name: 'address', type: 'core::starknet::contract_address::ContractAddress' }],
    outputs: [{ type: 'core::integer::u8' }],
    state_mutability: 'view',
  },
  {
    name: 'is_commitment_used',
    type: 'function',
    inputs: [{ name: 'commitment', type: 'core::integer::u256' }],
    outputs: [{ type: 'core::bool' }],
    state_mutability: 'view',
  },
  {
    name: 'get_badge_counts',
    type: 'function',
    inputs: [],
    outputs: [{ type: '(core::integer::u64, core::integer::u64, core::integer::u64)' }],
    state_mutability: 'view',
  },
];

export interface DonationProofInput {
  donationAmountCents: number;
  donorSecret: string;
  targetTier: BadgeTier;
}

export interface BadgeProof {
  fullProofWithHints: string[];
  threshold: string;
  donationCommitment: string;
  badgeTier: number;
}

export interface ProofGenerationStatus {
  stage: 'idle' | 'generating_proof' | 'complete' | 'error';
  message: string;
  progress?: number;
}

export class BadgeService {
  private provider: RpcProvider;
  private contract: Contract | null = null;
  private network: 'mainnet' | 'sepolia';
  private proofBackendUrl: string;

  constructor(
    provider: RpcProvider,
    network: 'mainnet' | 'sepolia' = 'sepolia',
    proofBackendUrl: string = 'https://shiny-computing-machine-vr99pj4vw5hx9qj-3001.app.github.dev/api/generate-proof',
  ) {
    this.provider = provider;
    // Force Sepolia for badges until mainnet deployment is ready
    this.network = 'sepolia';
    this.proofBackendUrl = proofBackendUrl;

    const contractAddress = BADGE_CONTRACT_ADDRESS[this.network];
    if (contractAddress && contractAddress !== '0x0') {
      const StarknetContract = Contract as unknown as new (...args: any[]) => Contract;
      this.contract = new StarknetContract(BADGE_ABI as any, contractAddress, provider);
    }
  }

  isContractDeployed(): boolean {
    const address = BADGE_CONTRACT_ADDRESS[this.network];
    return Boolean(address && address !== '0x0');
  }

  getTierThreshold(tier: BadgeTier): number {
    switch (tier) {
      case BadgeTier.BRONZE:
        return 1000;
      case BadgeTier.SILVER:
        return 10000;
      case BadgeTier.GOLD:
        return 100000;
      default:
        return 0;
    }
  }

  getTierName(tier: BadgeTier): string {
    switch (tier) {
      case BadgeTier.BRONZE:
        return '🥉 Bronze Donor ($10+)';
      case BadgeTier.SILVER:
        return '🥈 Silver Donor ($100+)';
      case BadgeTier.GOLD:
        return '🥇 Gold Donor ($1000+)';
      default:
        return 'No Badge';
    }
  }

  getEligibleTier(amountCents: number): BadgeTier {
    if (amountCents >= 100000) return BadgeTier.GOLD;
    if (amountCents >= 10000) return BadgeTier.SILVER;
    if (amountCents >= 1000) return BadgeTier.BRONZE;
    return BadgeTier.NONE;
  }

  async generateProof(
    input: DonationProofInput,
    onStatusUpdate?: (status: ProofGenerationStatus) => void,
  ): Promise<BadgeProof> {
    const threshold = this.getTierThreshold(input.targetTier);

    if (input.donationAmountCents < threshold) {
      throw new Error(
        `Donation amount $${(input.donationAmountCents / 100).toFixed(2)} is below ` +
          `threshold $${(threshold / 100).toFixed(2)} for ${this.getTierName(input.targetTier)}`,
      );
    }

    onStatusUpdate?.({
      stage: 'generating_proof',
      message: 'Generating ZK proof (up to 60 seconds)...',
      progress: 30,
    });

    const response = await fetch(this.proofBackendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        donation_amount: input.donationAmountCents,
        donor_secret: input.donorSecret,
        threshold,
        badge_tier: input.targetTier,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      onStatusUpdate?.({ stage: 'error', message: error });
      throw new Error(`Proof generation failed: ${error}`);
    }

    const result = await response.json();

    onStatusUpdate?.({
      stage: 'complete',
      message: 'Proof generated successfully!',
      progress: 100,
    });

    const donationCommitment =
      result.donation_commitment ?? result.commitment ?? result.commitment_hex;

    if (!donationCommitment) {
      throw new Error('Proof generation response missing commitment');
    }

    return {
      fullProofWithHints: result.calldata,
      threshold: threshold.toString(),
      donationCommitment: donationCommitment.toString(),
      badgeTier: input.targetTier,
    };
  }

  async claimBadge(account: Account, badgeProof: BadgeProof): Promise<string> {
    if (!this.contract || !this.isContractDeployed()) {
      throw new Error(
        'Badge contract not deployed. Please deploy and update BADGE_CONTRACT_ADDRESS.',
      );
    }

    this.contract.connect(account);

    const thresholdBigInt = BigInt(badgeProof.threshold);
    const commitmentBigInt = BigInt(badgeProof.donationCommitment);

    const tx = await this.contract.invoke('claim_badge', [
      badgeProof.fullProofWithHints,
      {
        low: thresholdBigInt & ((1n << 128n) - 1n),
        high: thresholdBigInt >> 128n,
      },
      {
        low: commitmentBigInt & ((1n << 128n) - 1n),
        high: commitmentBigInt >> 128n,
      },
      badgeProof.badgeTier,
    ]);

    await this.provider.waitForTransaction(tx.transaction_hash);
    return tx.transaction_hash;
  }

  async getUserBadgeTier(address: string): Promise<BadgeTier> {
    if (!this.contract || !this.isContractDeployed()) {
      return BadgeTier.NONE;
    }

    try {
      const tier = await this.contract.call('get_badge_tier', [address]);
      return Number(tier) as BadgeTier;
    } catch {
      return BadgeTier.NONE;
    }
  }

  async hasBadge(address: string, tier: BadgeTier): Promise<boolean> {
    if (!this.contract || !this.isContractDeployed()) {
      return false;
    }
    try {
      const result = await this.contract.call('has_badge', [address, tier]);
      return Boolean(result);
    } catch {
      return false;
    }
  }

  async isCommitmentUsed(commitment: string): Promise<boolean> {
    if (!this.contract || !this.isContractDeployed()) {
      return false;
    }
    try {
      const commitmentBigInt = BigInt(commitment);
      const result = await this.contract.call('is_commitment_used', [
        {
          low: commitmentBigInt & ((1n << 128n) - 1n),
          high: commitmentBigInt >> 128n,
        },
      ]);
      return Boolean(result);
    } catch {
      return false;
    }
  }

  async getBadgeCounts(): Promise<{ bronze: number; silver: number; gold: number }> {
    if (!this.contract || !this.isContractDeployed()) {
      return { bronze: 0, silver: 0, gold: 0 };
    }
    try {
      const result = (await this.contract.call('get_badge_counts', [])) as [
        bigint,
        bigint,
        bigint,
      ];
      return {
        bronze: Number(result[0]),
        silver: Number(result[1]),
        gold: Number(result[2]),
      };
    } catch {
      return { bronze: 0, silver: 0, gold: 0 };
    }
  }
}

