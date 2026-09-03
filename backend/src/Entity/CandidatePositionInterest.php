<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'candidate_position_interest')]
#[ORM\UniqueConstraint(name: 'uniq_candidate_position_interest', columns: ['candidate_profile_id', 'job_definition_id'])]
class CandidatePositionInterest
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'positionInterests')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?CandidateProfile $candidateProfile = null;

    #[ORM\ManyToOne(targetEntity: JobDefinition::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?JobDefinition $jobDefinition = null;

    #[ORM\Column(length: 30, nullable: true)]
    private ?string $knowledgeLevel = null;

    public function getId(): ?int { return $this->id; }
    public function getCandidateProfile(): ?CandidateProfile { return $this->candidateProfile; }
    public function setCandidateProfile(?CandidateProfile $profile): static { $this->candidateProfile = $profile; return $this; }
    public function getJobDefinition(): ?JobDefinition { return $this->jobDefinition; }
    public function setJobDefinition(JobDefinition $definition): static { $this->jobDefinition = $definition; return $this; }
    public function getKnowledgeLevel(): ?string { return $this->knowledgeLevel; }
    public function setKnowledgeLevel(?string $level): static { $this->knowledgeLevel = $level; return $this; }
}
