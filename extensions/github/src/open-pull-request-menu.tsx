import { Color, Icon, LaunchType, getPreferenceValues, launchCommand, open } from "@raycast/api";
import { useState } from "react";

import {
  MenuBarItem,
  MenuBarItemConfigureCommand,
  MenuBarRoot,
  MenuBarSection,
  getBoundedPreferenceNumber,
} from "./components/Menu";
import View from "./components/View";
import { PullRequestFieldsFragment } from "./generated/graphql";
import { SectionType, useMyPullRequests } from "./hooks/useMyPullRequests";

async function launchMyPullRequestsCommand(): Promise<void> {
  return launchCommand({ name: "my-pull-requests", type: LaunchType.UserInitiated });
}

function displayTitlePreference() {
  const prefs = getPreferenceValues();
  const val: boolean | undefined = prefs.showtext;
  return val == undefined ? true : val;
}

function getMaxPullRequestsPreference(): number {
  return getBoundedPreferenceNumber({ name: "maxitems" });
}

function getCheckStateEmoji(pr: PullRequestFieldsFragment): string | null {
  const checkState = pr.commits.nodes ? pr.commits.nodes[0]?.commit.statusCheckRollup?.state : null;
  switch (checkState) {
    case "SUCCESS":
      return "✅";
    case "ERROR":
    case "FAILURE":
      return "⚠️";
    case "PENDING":
      return "⏱️";
    default:
      return null;
  }
}

function joinArray(ar: (string | null | undefined)[], separator: string): string {
  const d = ar?.filter((e) => e);
  return d?.join(separator) || "";
}

function OpenPullRequestMenu() {
  const preferences = getPreferenceValues<Preferences.OpenPullRequestMenu>();
  const [selectedRepository] = useState<string | null>(null);
  const { data: sections, isLoading } = useMyPullRequests(selectedRepository);

  function displayTitle() {
    if (displayTitlePreference() !== true) {
      return undefined;
    }
    const sectionTypeMapping: Record<string, SectionType> = {
      includeOpenCount: SectionType.Open,
      includeAssignedCount: SectionType.Assigned,
      includeMentionedCount: SectionType.Mentioned,
      includeReviewRequestsCount: SectionType.ReviewRequests,
      includeReviewedCount: SectionType.Reviewed,
      includeRecentlyClosedCount: SectionType.RecentlyClosed,
    };

    const sectionTypesToInclude = Object.entries(preferences)
      .filter(([, value]) => value === true)
      .map(([key]) => sectionTypeMapping[key]);

    const count = sections.reduce(
      (acc, section) =>
        acc + (sectionTypesToInclude.includes(section.type) && section.pullRequests ? section.pullRequests.length : 0),
      0,
    );
    return `${count}`;
  }

  function filteredSections() {
    return sections.filter((section) => {
      const sectionTypeMapping: Record<string, SectionType> = {
        includeOpen: SectionType.Open,
        includeAssigned: SectionType.Assigned,
        includeMentioned: SectionType.Mentioned,
        includeReviewRequests: SectionType.ReviewRequests,
        includeReviewed: SectionType.Reviewed,
        includeRecentlyClosed: SectionType.RecentlyClosed,
      };

      const sectionTypesToInclude = Object.entries(preferences)
        .filter(([, value]) => value === true)
        .map(([key]) => sectionTypeMapping[key]);

      return sectionTypesToInclude.includes(section.type);
    });
  }

  return (
    <MenuBarRoot
      title={displayTitle()}
      icon={{ source: "pull-request.svg", tintColor: Color.PrimaryText }}
      isLoading={isLoading}
      tooltip="GitHub My Open Pull Requests"
    >
      {filteredSections().map((section) => {
        return (
          <MenuBarSection
            key={section.type}
            title={section.type}
            maxChildren={getMaxPullRequestsPreference()}
            moreElement={(hidden) => (
              <MenuBarItem title={`... ${hidden} more`} onAction={() => launchMyPullRequestsCommand()} />
            )}
            emptyElement={<MenuBarItem title="No Pull Requests" />}
          >
            {section.pullRequests?.map((i) => {
              // GitHub had an outage on Nov. 3rd that caused the returned PRs to be null
              // This corrupted the cache so let's check first if there's a PR before rendering
              if (!i) return null;
              return (
                <MenuBarItem
                  key={i.id}
                  title={`#${i.number} ${i.title} ${joinArray([getCheckStateEmoji(i)], "")}`}
                  icon={{ source: "pull-request.svg", tintColor: Color.PrimaryText }}
                  tooltip={i.repository.nameWithOwner}
                  onAction={() => open(i.permalink)}
                />
              );
            })}
          </MenuBarSection>
        );
      })}

      <MenuBarSection>
        <MenuBarItem
          title="Open My Pull Requests"
          icon={Icon.Terminal}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={() => launchMyPullRequestsCommand()}
        />
        <MenuBarItemConfigureCommand />
      </MenuBarSection>
    </MenuBarRoot>
  );
}

export default function Command() {
  return (
    <View>
      <OpenPullRequestMenu />
    </View>
  );
}
