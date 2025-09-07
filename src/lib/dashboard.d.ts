export type GoalSummary = {
    total_leaders_goal: number;
    default_org_goal: number;
    effective_total_goal: number;
};
export declare function getGoalSummary(): Promise<GoalSummary>;
export declare function setOrgDefaultGoal(newGoal: number): Promise<void>;
export declare function getLeaderCounters(): Promise<{
    pending: number;
    active: number;
}>;
