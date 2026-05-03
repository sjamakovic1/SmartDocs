import type { DocumentStatus } from '../../types/document';
import Input from '../common/Input';
import Select from '../common/Select';

interface DocumentFiltersProps {
  search: string;
  status: 'ALL' | DocumentStatus;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: 'ALL' | DocumentStatus) => void;
}

const STATUS_OPTIONS: Array<{ value: 'ALL' | DocumentStatus; label: string }> = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'UPLOADED', label: 'Uploaded' },
  { value: 'NEEDS_REVIEW', label: 'Needs Review' },
  { value: 'VALIDATED', label: 'Validated' },
  { value: 'REJECTED', label: 'Rejected' },
];

export default function DocumentFilters({
  search,
  status,
  onSearchChange,
  onStatusChange,
}: DocumentFiltersProps) {
  return (
    <div className="grid gap-4 md:grid-cols-[1fr_220px]">
      <Input
        label="Search"
        placeholder="Supplier or document number"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
      />
      <Select
        label="Status"
        value={status}
        onChange={(event) => onStatusChange(event.target.value as 'ALL' | DocumentStatus)}
      >
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
