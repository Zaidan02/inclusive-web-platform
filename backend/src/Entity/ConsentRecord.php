<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'consent_record')]
#[ORM\Index(name: 'IDX_CONSENT_CANDIDATE_PURPOSE', columns: ['candidate_id', 'purpose'])]
class ConsentRecord
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?User $candidate = null;

    #[ORM\Column(length: 80)]
    private string $purpose;

    #[ORM\Column(length: 30)]
    private string $policyVersion;

    #[ORM\Column(type: 'json')]
    private array $details = [];

    #[ORM\Column]
    private \DateTimeImmutable $grantedAt;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $withdrawnAt = null;

    public function __construct() { $this->grantedAt = new \DateTimeImmutable(); }
    public function getId(): ?int { return $this->id; }
    public function getCandidate(): ?User { return $this->candidate; }
    public function setCandidate(User $candidate): static { $this->candidate = $candidate; return $this; }
    public function getPurpose(): string { return $this->purpose; }
    public function setPurpose(string $purpose): static { $this->purpose = $purpose; return $this; }
    public function getPolicyVersion(): string { return $this->policyVersion; }
    public function setPolicyVersion(string $version): static { $this->policyVersion = $version; return $this; }
    public function getDetails(): array { return $this->details; }
    public function setDetails(array $details): static { $this->details = $details; return $this; }
    public function getGrantedAt(): \DateTimeImmutable { return $this->grantedAt; }
    public function getWithdrawnAt(): ?\DateTimeImmutable { return $this->withdrawnAt; }
    public function setWithdrawnAt(?\DateTimeImmutable $at): static { $this->withdrawnAt = $at; return $this; }
}
