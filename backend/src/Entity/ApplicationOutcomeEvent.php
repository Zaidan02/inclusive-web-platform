<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'application_outcome_event')]
#[ORM\Index(columns: ['application_id', 'created_at'], name: 'IDX_APPLICATION_OUTCOME_TIMELINE')]
#[ORM\Index(columns: ['actor_id'], name: 'IDX_APPLICATION_OUTCOME_ACTOR')]
class ApplicationOutcomeEvent
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: JobApplication::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?JobApplication $application = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?User $actor = null;

    #[ORM\Column(length: 50, nullable: true)]
    private ?string $previousStatus = null;

    #[ORM\Column(length: 50)]
    private string $newStatus;

    #[ORM\Column(length: 20)]
    private string $notificationStatus = 'not_required';

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }
    public function getApplication(): ?JobApplication { return $this->application; }
    public function setApplication(JobApplication $application): static { $this->application = $application; return $this; }
    public function getActor(): ?User { return $this->actor; }
    public function setActor(User $actor): static { $this->actor = $actor; return $this; }
    public function getPreviousStatus(): ?string { return $this->previousStatus; }
    public function setPreviousStatus(?string $status): static { $this->previousStatus = $status; return $this; }
    public function getNewStatus(): string { return $this->newStatus; }
    public function setNewStatus(string $status): static { $this->newStatus = $status; return $this; }
    public function getNotificationStatus(): string { return $this->notificationStatus; }
    public function setNotificationStatus(string $status): static { $this->notificationStatus = $status; return $this; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
