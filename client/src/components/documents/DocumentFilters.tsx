import type { DocumentStatus } from '../../types/document';
import Input from '../common/Input';
import Select from '../common/Select';

interface DocumentFiltersProps {
  search: string;
  status: 'ALL' | DocumentStatus;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: 'ALL' | DocumentStatus) => void;
}

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
        <option value="ALL">All statuses</option>
        <option value="UPLOADED">Uploaded</option>
        <option value="NEEDS_REVIEW">Needs Review</option>
        <option value="VALIDATED">Validated</option>
        <option value="REJECTED">Rejected</option>
      </Select>
    </div>
  );
}
