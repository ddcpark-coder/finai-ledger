<?php
namespace App\Application\Projects;

use App\Domain\Projects\ProjectWorkflow;
use Illuminate\Support\Facades\DB;

final class ChangeProjectStatus
{
    public function execute(int $projectId,string $to,int $userId): void
    {
        DB::transaction(function () use ($projectId,$to,$userId) {
            $project=DB::table('projects')->lockForUpdate()->find($projectId);
            if (! $project) throw new \DomainException('Project not found.');

            ProjectWorkflow::assertTransition($project->status,$to);

            DB::table('projects')->where('id',$projectId)->update([
                'status'=>$to,'completed_on'=>$to==='completed'?now()->toDateString():$project->completed_on,
                'updated_at'=>now()
            ]);

            DB::table('project_events')->insert([
                'project_id'=>$projectId,'event_type'=>'status_changed','actor_user_id'=>$userId,
                'metadata'=>json_encode(['from'=>$project->status,'to'=>$to]),'occurred_at'=>now(),
                'created_at'=>now(),'updated_at'=>now()
            ]);
        });
    }
}
