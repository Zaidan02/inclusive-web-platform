<?php

namespace App\Entity;

use App\Repository\CandidateVerificationRequestRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: CandidateVerificationRequestRepository::class)]
#[ORM\Table(name: 'candidate_verification_request')]
#[ORM\Index(name: 'IDX_CANDIDATE_VERIFICATION_STATUS', columns: ['status'])]
class CandidateVerificationRequest
{
    public const STATUS_PENDING = 'pending';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_REJECTED = 'rejected';
    public const STATUSES = [self::STATUS_PENDING, self::STATUS_APPROVED, self::STATUS_REJECTED];

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\OneToOne(inversedBy: 'candidateVerificationRequest')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?User $candidate = null;

    #[ORM\Column(length: 100)]
    private ?string $documentStoredName = null;

    #[ORM\Column(length: 255)]
    private ?string $documentOriginalName = null;

    #[ORM\Column(length: 100)]
    private ?string $documentMimeType = null;

    #[ORM\Column]
    private ?int $documentSize = null;

    #[ORM\Column(length: 20)]
    private string $status = self::STATUS_PENDING;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(onDelete: 'SET NULL')]
    private ?User $reviewer = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $reviewerNote = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $submittedAt = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $reviewedAt = null;

    public function getId(): ?int { return $this->id; }
    public function getCandidate(): ?User { return $this->candidate; }
    public function setCandidate(User $candidate): static { $this->candidate = $candidate; return $this; }
    public function getDocumentStoredName(): ?string { return $this->documentStoredName; }
    public function setDocumentStoredName(string $name): static { $this->documentStoredName = $name; return $this; }
    public function getDocumentOriginalName(): ?string { return $this->documentOriginalName; }
    public function setDocumentOriginalName(string $name): static { $this->documentOriginalName = $name; return $this; }
    public function getDocumentMimeType(): ?string { return $this->documentMimeType; }
    public function setDocumentMimeType(string $type): static { $this->documentMimeType = $type; return $this; }
    public function getDocumentSize(): ?int { return $this->documentSize; }
    public function setDocumentSize(int $size): static { $this->documentSize = $size; return $this; }
    public function getStatus(): string { return $this->status; }
    public function setStatus(string $status): static
    {
        if (!in_array($status, self::STATUSES, true)) {
            throw new \InvalidArgumentException('Invalid candidate verification status.');
        }
        $this->status = $status;
        return $this;
    }
    public function isApproved(): bool { return $this->status === self::STATUS_APPROVED; }
    public function getReviewer(): ?User { return $this->reviewer; }
    public function setReviewer(?User $reviewer): static { $this->reviewer = $reviewer; return $this; }
    public function getReviewerNote(): ?string { return $this->reviewerNote; }
    public function setReviewerNote(?string $note): static { $this->reviewerNote = $note; return $this; }
    public function getSubmittedAt(): ?\DateTimeImmutable { return $this->submittedAt; }
    public function setSubmittedAt(\DateTimeImmutable $at): static { $this->submittedAt = $at; return $this; }
    public function getReviewedAt(): ?\DateTimeImmutable { return $this->reviewedAt; }
    public function setReviewedAt(?\DateTimeImmutable $at): static { $this->reviewedAt = $at; return $this; }
}
