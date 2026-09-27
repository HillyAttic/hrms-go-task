import { TrashIcon } from "@/assets/icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import { getInvoiceTableData } from "./fetch";
import { DownloadIcon, PreviewIcon } from "./icons";

export async function InvoiceTable() {
  const data = await getInvoiceTableData();

  return (
    <div className="rounded-[10px] border border-stroke bg-card p-4 shadow-hard dark:border-dark-3 sm:p-7.5">
      <Table>
        <TableHeader>
          <TableRow className="border-none bg-muted [&>th]:py-4 [&>th]:text-base [&>th]:text-dark dark:[&>th]:text-white">
            <TableHead className="min-w-[155px] xl:pl-7.5">Package</TableHead>
            <TableHead>Invoice Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right xl:pr-7.5">Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {data.map((item, index) => (
            <TableRow key={index} className="border-border dark:border-dark-3">
              <TableCell className="min-w-[155px] xl:pl-7.5">
                <h5 className="text-dark dark:text-white">{item.name}</h5>
                <p className="mt-[3px] text-body-sm font-medium">
                  ${item.price}
                </p>
              </TableCell>

              <TableCell>
                <p className="text-dark dark:text-white">
                  {dayjs(item.date).format("MMM DD, YYYY")}
                </p>
              </TableCell>

              <TableCell>
                <div
                  className={cn(
                    "max-w-fit rounded-full px-3.5 py-1 text-sm font-medium",
                    {
                      "bg-success/[0.08] text-success":
                        item.status === "Paid",
                      "bg-destructive/[0.08] text-destructive":
                        item.status === "Unpaid",
                      "bg-warning/[0.08] text-warning":
                        item.status === "Pending",
                    },
                  )}
                >
                  {item.status}
                </div>
              </TableCell>

              <TableCell className="xl:pr-7.5">
                <div className="flex items-center justify-end gap-x-3.5">
                  <button className="hover:text-foreground">
                    <span className="sr-only">View Invoice</span>
                    <PreviewIcon />
                  </button>

                  <button className="hover:text-foreground">
                    <span className="sr-only">Delete Invoice</span>
                    <TrashIcon />
                  </button>

                  <button className="hover:text-foreground">
                    <span className="sr-only">Download Invoice</span>
                    <DownloadIcon />
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
