import Image from "next/image";
import Link from "next/link";
import type { GistList } from "@/repositories/gist";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

export function FeaturedCarousel({ gists }: { gists: GistList }) {
  if (gists.length === 0) return null;

  return (
    <Carousel className="mx-12" opts={{ align: "start" }}>
      <CarouselContent>
        {gists.map((gist) => {
          const type = gist.entry.type.toLowerCase();
          const image = `/api/og?title=${encodeURIComponent(gist.entry.title)}`;
          return (
            <CarouselItem key={gist.id} className="basis-full md:basis-1/2 lg:basis-1/3">
              <Link href={`/${type}/${gist.slug}`} className="group block space-y-2">
                <Image
                  src={image}
                  // Decorative: the visible <h3> beneath already carries the
                  // title text, so a screen reader announcing the same
                  // string as the image's alt would speak it twice per card.
                  // Accepted deviation from the spec's "composed alt" wording.
                  alt=""
                  width={1200}
                  height={630}
                  sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                  className="aspect-[1200/630] w-full rounded-2xl object-cover transition-opacity group-hover:opacity-80"
                />
                <p className="prose-muted text-xs uppercase">{gist.entry.type}</p>
                <h3 className="line-clamp-2 font-semibold">{gist.entry.title}</h3>
              </Link>
            </CarouselItem>
          );
        })}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
}
