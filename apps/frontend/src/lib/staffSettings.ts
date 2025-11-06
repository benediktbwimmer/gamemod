export type StaffSiteSettings = {
  brandLabel: string;
  brandHeading: string;
  headerNote: string;
  headerGreeting: string;
  guildName: string;
  showGuildCard: boolean;
  showTopicsPanel: boolean;
};

export const defaultStaffSiteSettings: StaffSiteSettings = {
  brandLabel: "GameMod",
  brandHeading: "Control Center",
  headerNote: "Operations Checkpoint",
  headerGreeting: "Welcome back, Commander Vega",
  guildName: "NovaWatch",
  showGuildCard: true,
  showTopicsPanel: true
};
