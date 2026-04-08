import { Skeleton } from '@/components/ui/skeleton'
import { TableBody, TableCell, TableRow } from '@/components/ui/table'

const CELL_WIDTHS = ['w-2/3', 'w-1/2', 'w-1/3', 'w-3/4', 'w-1/2']

type TableRowSkeletonProps = {
  columns: number
  rows?: number
  hiddenColumns?: number[]
}

function TableRowSkeleton({ columns, rows = 5, hiddenColumns }: TableRowSkeletonProps) {
  return (
    <TableBody>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <TableRow key={rowIndex}>
          {Array.from({ length: columns }, (_, colIndex) => (
            <TableCell
              key={colIndex}
              className={hiddenColumns?.includes(colIndex) ? 'hidden sm:table-cell' : undefined}
            >
              <Skeleton className={`h-4 ${CELL_WIDTHS[colIndex % CELL_WIDTHS.length]}`} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  )
}

export { TableRowSkeleton }
