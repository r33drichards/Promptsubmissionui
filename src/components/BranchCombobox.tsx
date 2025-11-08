import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from './ui/utils';
import { Button } from './ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './ui/command';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { truncateBranchName } from '@/utils/stringUtils';

interface BranchComboboxProps {
  value: string;
  onChange: (value: string) => void;
  branches: string[];
  id?: string;
  disabled?: boolean;
}

export function BranchCombobox({
  value,
  onChange,
  branches,
  id,
  disabled = false,
}: BranchComboboxProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
          title={value || 'Select branch...'}
        >
          {value ? truncateBranchName(value) : 'Select branch...'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search branch..." />
          <CommandList>
            <CommandEmpty>No branch found.</CommandEmpty>
            <CommandGroup>
              {branches.map((branch) => (
                <CommandItem
                  key={branch}
                  value={branch}
                  onSelect={(currentValue) => {
                    // Always set the selected branch, don't toggle to empty
                    // (targetBranch is a required field)
                    onChange(currentValue);
                    setOpen(false);
                  }}
                  title={branch}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === branch ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {truncateBranchName(branch)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
