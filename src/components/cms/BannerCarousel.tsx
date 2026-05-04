
import { useCMS } from "@/hooks/useCMS";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export function BannerCarousel() {
  const { banners, isLoading } = useCMS();
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [Autoplay()]);
  const [prevBtnEnabled, setPrevBtnEnabled] = useState(false);
  const [nextBtnEnabled, setNextBtnEnabled] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setPrevBtnEnabled(emblaApi.canScrollPrev());
    setNextBtnEnabled(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
  }, [emblaApi, onSelect]);

  if (isLoading || banners.length === 0) return null;

  return (
    <div className="relative group">
      <div className="overflow-hidden rounded-xl bg-muted" ref={emblaRef}>
        <div className="flex">
          {banners.map((banner) => (
            <div key={banner.id} className="relative flex-[0_0_100%] min-w-0 aspect-[21/9] sm:aspect-[3/1]">
              {banner.link_url ? (
                <Link to={banner.link_url}>
                  <img
                    src={banner.image_url}
                    alt={banner.title}
                    className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                </Link>
              ) : (
                <img
                  src={banner.image_url}
                  alt={banner.title}
                  className="h-full w-full object-cover"
                />
              )}
              {/* Optional: Banner Overlay Info */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-6 sm:p-10 text-white">
                <h2 className="text-xl sm:text-3xl font-bold mb-2">{banner.title}</h2>
              </div>
            </div>
          ))}
        </div>
      </div>

      {banners.length > 1 && (
        <>
          <Button
            variant="outline"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm"
            onClick={scrollPrev}
            disabled={!prevBtnEnabled}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm"
            onClick={scrollNext}
            disabled={!nextBtnEnabled}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
            {banners.map((_, index) => (
              <button
                key={index}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  index === selectedIndex ? "w-6 bg-white" : "w-1.5 bg-white/50"
                )}
                onClick={() => emblaApi?.scrollTo(index)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
