<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'candidate_verification_access_event')]
class CandidateVerificationAccessEvent
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: CandidateVerificationRequest::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?CandidateVerificationRequest $verificationRequest = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?User $actor = null;

    #[ORM\Column(length: 30)]
    private string $action;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    public function __construct() { $this->createdAt = new \DateTimeImmutable(); }
    public function getId(): ?int { return $this->id; }
    public function setVerificationRequest(CandidateVerificationRequest $request): static { $this->verificationRequest = $request; return $this; }
    public function setActor(User $actor): static { $this->actor = $actor; return $this; }
    public function setAction(string $action): static { $this->action = $action; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
