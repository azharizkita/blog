import { Suspense } from "react";
import { TabsContent } from "../ui/tabs";
import { CategoryToggle } from "./category-toggle";
import { TabWrapper } from "./tab-wrapper";

export function CategoryTab() {
  return (
    <Suspense>
      <TabWrapper>
        <TabsContent value="All" className="self-start">
          <CategoryToggle />
        </TabsContent>
        <TabsContent value="Blog" className="self-start">
          <CategoryToggle />
        </TabsContent>
        <TabsContent value="Poem" className="self-start">
          <CategoryToggle />
        </TabsContent>
        <TabsContent value="Sharing" className="self-start">
          <CategoryToggle />
        </TabsContent>
      </TabWrapper>
    </Suspense>
  );
}
