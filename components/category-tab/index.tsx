import getPathname from "@/lib/get-pathname";
import { TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { CategoryToggle } from "./category-toggle";
import { TabWrapper } from "./tab-wrapper";

export async function CategoryTab() {
  const pathname = await getPathname();
  return (
    <TabWrapper>
      <TabsList className="w-full">
        <TabsTrigger className="w-full" value="All">
          Articles
        </TabsTrigger>
        <TabsTrigger className="w-full" value="Beep">
          Beeps
        </TabsTrigger>
      </TabsList>
      <TabsContent value="All" className="self-start">
        <CategoryToggle pathname={pathname} />
      </TabsContent>
      <TabsContent value="Blog" className="self-start">
        <CategoryToggle pathname={pathname} />
      </TabsContent>
      <TabsContent value="Poetry" className="self-start">
        <CategoryToggle pathname={pathname} />
      </TabsContent>
      <TabsContent value="Sharing" className="self-start">
        <CategoryToggle pathname={pathname} />
      </TabsContent>
    </TabWrapper>
  );
}
