import { TabsContent } from "../ui/tabs";
import { CategoryToggle } from "./category-toggle";
import { TabWrapper } from "./tab-wrapper";

export function CategoryTab() {
  return (
    <TabWrapper>
      <TabsContent value="Articles" className="self-start">
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
  );
}
