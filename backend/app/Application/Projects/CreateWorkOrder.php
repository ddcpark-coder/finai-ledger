<?php
namespace App\Application\Projects;

use Illuminate\Support\Facades\DB;

final class CreateWorkOrder
{
    public function execute(
        int $projectId,string $title,int $userId,?int $taskId=null,?int $assignedTo=null,
        ?string $scheduledStart=null,?string $scheduledEnd=null,string $workType='internal'
    ): int {
        return DB::transaction(function () use ($projectId,$title,$userId,$taskId,$assignedTo,$scheduledStart,$scheduledEnd,$workType) {
            $project=DB::table('projects')->find($projectId);
            if (! $project) throw new \DomainException('Project not found.');
            if ($taskId && ! DB::table('project_tasks')->where('id',$taskId)->where('project_id',$projectId)->exists()) {
                throw new \DomainException('Task does not belong to project.');
            }

            $year=(int)now()->year;
            $sequence=DB::table('work_order_sequences')
                ->where('company_id',$project->company_id)->where('year',$year)->lockForUpdate()->first();

            if (! $sequence) {
                DB::table('work_order_sequences')->insert([
                    'company_id'=>$project->company_id,'year'=>$year,'next_number'=>2,
                    'created_at'=>now(),'updated_at'=>now()
                ]);
                $next=1;
            } else {
                $next=(int)$sequence->next_number;
                DB::table('work_order_sequences')->where('id',$sequence->id)->update([
                    'next_number'=>$next+1,'updated_at'=>now()
                ]);
            }

            return DB::table('work_orders')->insertGetId([
                'company_id'=>$project->company_id,'project_id'=>$projectId,'project_task_id'=>$taskId,
                'number'=>sprintf('DN-%d-%04d',$year,$next),'title'=>trim($title),'status'=>'planned',
                'work_type'=>$workType,'assigned_to'=>$assignedTo,'scheduled_start'=>$scheduledStart,
                'scheduled_end'=>$scheduledEnd,'created_at'=>now(),'updated_at'=>now()
            ]);
        });
    }
}
