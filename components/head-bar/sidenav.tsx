import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import Content from "./content";
import Link from "next/link";
import { Menu } from "lucide-react";

export function Sidenav() {
  return (
    <Sheet>
      <SheetTrigger asChild className="cursor-pointer">
        <Button
          variant="outline"
          className="top-4 left-4 absolute h-[42px] w-[42px]"
        >
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle>
            <Link href="/">
              <div className="flex flex-col gap-0 items-center">
                <h1 className="text-3xl font-semibold tracking-tight">
                  Silenced
                </h1>
                <h1 className="text-sm tracking-tight text-primary -mt-2">
                  personal dumps
                </h1>
              </div>
            </Link>
          </SheetTitle>
        </SheetHeader>
        <div className="px-4 overflow-y-auto">
          <Content />
        </div>
      </SheetContent>
    </Sheet>
  );
}
