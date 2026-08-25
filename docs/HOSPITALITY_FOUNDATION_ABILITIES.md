# Hospitality foundation abilities

## Requirement

Formal education alone does not describe a candidate's readiness for practical hospitality work. The candidate profile therefore records three reusable foundation abilities:

- reading;
- writing;
- counting.

Each job application also records the candidate's current basic knowledge related to the selected position. The label is generated from the published job title, for example, “Basic knowledge related to Chocolate/Confectionery Worker.”

## Inclusive response model

Every question uses the same three controlled values:

| Stored value | User-facing meaning |
| --- | --- |
| `independent` | Yes, independently |
| `with_support` | Yes, with support |
| `not_yet` | Not yet |

This model avoids treating assistance as inability and gives employers useful information for workplace planning. The controls are required, keyboard accessible, screen-reader labelled, responsive, and translated into English, French, and Arabic.

## Data and access boundary

- Reading, writing, and counting are stored in `CandidateProfile` and can be updated from onboarding or **My profile**.
- Position knowledge is stored in `JobApplication`, because it can differ between jobs.
- The candidate can retrieve these data in the privacy export.
- The employer sees the answers only in the context of an application received for one of its own jobs.
- Administrators receive the application field through the protected administration API.
- No application document or recommendation letter is required.

## Conditional scoring policy

The fields are evaluated only against requirements explicitly configured by HR for a vacancy:

- `not_required` excludes the field from both numerator and denominator;
- `preferred` affects ranking but does not create an eligibility failure;
- `required` can affect eligibility when the candidate cannot currently perform the skill;
- `with_support` satisfies a required skill when the vacancy offers assistance and receives the documented supported-work factor;
- an unmet individual skill never forces the whole percentage to zero.

Education follows the same employer-controlled approach. With the default `not_required` value it has no effect. The previous fixture-only education gates were removed because they were not sourced from the supplied workbooks.

“Personal education” is treated as a structural source heading. Write, Read, Count, and Basic knowledge related to the position are its child HR inputs and are removed from ordinary disability/task scoring to prevent double counting. Position knowledge is added when the candidate submits an application, producing an application-specific compatibility snapshot for authorized HR review.

## Verification

The implementation is covered by:

- the locale-contract test, which ensures the same labels exist in all three languages;
- frontend build and lint checks;
- integration validation of the three controlled profile values;
- an end-to-end check that the candidate can locate and use the three labelled controls.

The database migration `Version20260825000100` must be applied before using the new fields in a running environment.
