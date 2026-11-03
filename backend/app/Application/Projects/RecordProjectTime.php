<?php
namespace App\Application\Projects;

use App\Domain\Projects\ProjectProfitability;
use Illuminate\Support\Facades\DB;

final class RecordProjectTime
{
    public function execute(
        int $projectId,int $userId,string $workDate,float $hours,float $costRate,
        ?int $taskId=null,?int $workOrderId=null,?string $description=null
    ): int {
        ProjectProfitability::assertHours($hours);
        if ($costRate<0) throw new \DomainException('Cost rate cannot be negative.');

        return DB::transaction(function () use ($projectId,$userId,$workDate,$hours,$costRate,$taskId,$workOrderId,$description) {
            $project=DB::table('projects')->find($projectId);
            if (! $project) throw new \DomainException('Project not found.');

            if ($taskId && ! DB::table('project_tasks')->where('id',$taskId)->where('project_id',$projectId)->exists()) {
                throw new \DomainException('Task does not belong to project.');
            }
            if ($workOrderId && ! DB::table('work_orders')->where('id',$workOrderId)->where('project_id',$projectId)->exists()) {
                throw new \DomainException('Work order does not belong to project.');
            }

            $timeId=DB::table('time_entries')->insertGetId([
                'company_id'=>$project->company_id,'project_id'=>$projectId,'project_task_id'=>$taskId,
                'work_order_id'=>$workOrderId,'user_id'=>$userId,'work_date'=>$workDate,'hours'=>$hours,
                'cost_rate'=>$costRate,'description'=>$description,'status'=>'approved',
                'created_at'=>now(),'updated_at'=>now()
            ]);

            DB::table('project_financial_entries')->insert([
                'company_id'=>$project->company_id,'project_id'=>$projectId,'entry_type'=>'cost','category'=>'labor',
                'amount'=>round($hours*$costRate,2),'source_type'=>'time_entry','source_id'=>$timeId,
                'description'=>$description ?? 'Delo','recognized_on'=>$workDate,'created_at'=>now(),'updated_at'=>now()
            ]);

            if ($taskId) {
                DB::table('project_tasks')->where('id',$taskId)->increment('actual_hours',$hours,['updated_at'=>now()]);
            }

            return $timeId;
        });
    }
}
