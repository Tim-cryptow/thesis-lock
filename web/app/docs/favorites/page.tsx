import type { Metadata } from "next";
import { Code, H2, Lead, List, P } from "../ui";

export const metadata: Metadata = {
  title: { absolute: "Favorites | ThesisLock Docs" },
  description:
    "Star hashes, wallets, groups, and pages for quick access from the favorites bar and the favorites page.",
};

export default function FavoritesDocs() {
  return (
    <div>
      <h1 className="text-3xl md:text-4xl">Favorites</h1>
      <Lead>
        Favorites let you star the hashes, wallets, groups, and pages you return
        to often, then reach them again from anywhere in the app. Like the
        watchlist and collections, favorites live only in this browser.
      </Lead>

      <H2>Starring an item</H2>
      <P>
        A small star button sits next to starrable items: the hash on a verify
        page, the address on a profile, a group name, and every row in your
        anchors, the feed, and search results. Click the star to add the item;
        click it again to remove it. The star fills amber once an item is
        favorited.
      </P>

      <H2>Reaching your favorites</H2>
      <List
        items={[
          <>
            A collapsible favorites bar sits at the top of every page, with a
            chip for each favorite that links straight to it.
          </>,
          <>
            A star in the top corner, with a count badge, opens the favorites
            page.
          </>,
          <>
            The favorites page lists everything grouped by type, or sorted by
            when you added it, with a type badge, the value, the date added, and
            links to open or remove each one.
          </>,
        ]}
      />

      <H2>Where favorites live</H2>
      <P>
        Favorites are stored in your browser under{" "}
        <Code>localStorage</Code> and are never sent anywhere. They stay on this
        device, so clearing site data removes them, and they do not follow you to
        another browser.
      </P>
    </div>
  );
}
