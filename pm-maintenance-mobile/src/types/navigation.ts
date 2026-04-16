import type { TaskDetails } from "./api";

export type RootStackParamList = {
  Dashboard: undefined;
  TaskList: undefined;
  TaskApproval: undefined;
  UpcomingTasks: undefined;
  TaskDocuments: {
    task: TaskDetails;
  };
};
