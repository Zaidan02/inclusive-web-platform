<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'candidate_profile_ai_event')]
class CandidateProfileAiEvent
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?User $candidate = null;

    #[ORM\Column(length: 40)]
    private string $eventType;

    #[ORM\Column(length: 16)]
    private string $language = 'und';

    #[ORM\Column(type: 'json')]
    private array $details = [];

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }
    public function getCandidate(): ?User { return $this->candidate; }
    public function setCandidate(User $candidate): static { $this->candidate = $candidate; return $this; }
    public function getEventType(): string { return $this->eventType; }
    public function setEventType(string $eventType): static { $this->eventType = $eventType; return $this; }
    public function getLanguage(): string { return $this->language; }
    public function setLanguage(string $language): static { $this->language = $language; return $this; }
    public function getDetails(): array { return $this->details; }
    public function setDetails(array $details): static { $this->details = $details; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
