'use client'

import {
  ArrowDownIcon,
  ArrowUpIcon,
  CaretLeftIcon,
  CaretLineLeftIcon,
  CaretLineRightIcon,
  CaretRightIcon,
} from '@phosphor-icons/react'
import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table'
import * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Person = {
  id: number
  name: string
  email: string
  role: string
  status: 'active' | 'inactive' | 'pending'
  age: number
}

const data: Person[] = [
  {
    id: 1,
    name: 'Alice Johnson',
    email: 'alice@example.com',
    role: 'Engineer',
    status: 'active',
    age: 29,
  },
  {
    id: 2,
    name: 'Bob Smith',
    email: 'bob@example.com',
    role: 'Designer',
    status: 'active',
    age: 34,
  },
  {
    id: 3,
    name: 'Charlie Brown',
    email: 'charlie@example.com',
    role: 'Manager',
    status: 'inactive',
    age: 45,
  },
  {
    id: 4,
    name: 'Diana Prince',
    email: 'diana@example.com',
    role: 'Engineer',
    status: 'active',
    age: 31,
  },
  {
    id: 5,
    name: 'Eve Davis',
    email: 'eve@example.com',
    role: 'Designer',
    status: 'pending',
    age: 27,
  },
  {
    id: 6,
    name: 'Frank Miller',
    email: 'frank@example.com',
    role: 'Engineer',
    status: 'active',
    age: 38,
  },
  {
    id: 7,
    name: 'Grace Lee',
    email: 'grace@example.com',
    role: 'Manager',
    status: 'active',
    age: 42,
  },
  {
    id: 8,
    name: 'Henry Wilson',
    email: 'henry@example.com',
    role: 'Designer',
    status: 'inactive',
    age: 36,
  },
  {
    id: 9,
    name: 'Iris Chen',
    email: 'iris@example.com',
    role: 'Engineer',
    status: 'active',
    age: 28,
  },
  {
    id: 10,
    name: 'Jack Taylor',
    email: 'jack@example.com',
    role: 'Manager',
    status: 'pending',
    age: 50,
  },
  {
    id: 11,
    name: 'Karen White',
    email: 'karen@example.com',
    role: 'Engineer',
    status: 'active',
    age: 33,
  },
  {
    id: 12,
    name: 'Leo Martinez',
    email: 'leo@example.com',
    role: 'Designer',
    status: 'active',
    age: 26,
  },
]

const statusVariant: Record<Person['status'], 'default' | 'secondary' | 'outline'> = {
  active: 'default',
  inactive: 'secondary',
  pending: 'outline',
}

const columns: ColumnDef<Person>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: (info) => <span className="font-medium">{info.getValue<string>()}</span>,
  },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: (info) => <span className="text-muted-foreground">{info.getValue<string>()}</span>,
  },
  {
    accessorKey: 'role',
    header: 'Role',
  },
  {
    accessorKey: 'age',
    header: 'Age',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: (info) => {
      const status = info.getValue<Person['status']>()
      return <Badge variant={statusVariant[status]}>{status}</Badge>
    },
  },
]

export function DemoTable() {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = React.useState('')

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 5 } },
  })

  return (
    <div className="w-full space-y-4">
      <Input
        placeholder="Search all columns..."
        value={globalFilter}
        onChange={(e) => setGlobalFilter(e.target.value)}
        className="max-w-sm"
      />

      <div className="overflow-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    colSpan={header.colSpan}
                    className="px-4 py-3 text-left font-medium"
                  >
                    {header.isPlaceholder ? null : (
                      <button
                        type="button"
                        className={
                          header.column.getCanSort()
                            ? 'flex cursor-pointer select-none items-center gap-1 bg-transparent border-none p-0 font-inherit text-inherit'
                            : ''
                        }
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: <ArrowUpIcon className="size-3.5" />,
                          desc: <ArrowDownIcon className="size-3.5" />,
                        }[header.column.getIsSorted() as string] ?? null}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-b last:border-b-0">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-muted-foreground px-4 py-8 text-center"
                >
                  No results found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm">
          {table.getFilteredRowModel().rows.length} row(s) total
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => table.firstPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <CaretLineLeftIcon className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <CaretLeftIcon className="size-4" />
          </Button>
          <span className="text-muted-foreground px-2 text-sm">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <CaretRightIcon className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => table.lastPage()}
            disabled={!table.getCanNextPage()}
          >
            <CaretLineRightIcon className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
