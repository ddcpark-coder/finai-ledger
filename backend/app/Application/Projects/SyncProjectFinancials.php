<?php
namespace App\Application\Projects;

use Illuminate\Support\Facades\DB;

final class SyncProjectFinancials
{
    public function execute(int $projectId): void
    {
        DB::transaction(function () use ($projectId) {
            $project=DB::table('projects')->lockForUpdate()->find($projectId);
            if (! $project) throw new \DomainException('Project not found.');

            $revenue=(float)DB::table('project_financial_entries')
                ->where('project_id',$projectId)->where('entry_type','revenue')->sum('amount');
            $cost=(float)DB::table('project_financial_entries')
                ->where('project_id',$projectId)->where('entry_type','cost')->sum('amount');

            $margin=round($revenue-$cost,2);
            $marginPercent=$revenue>0 ? round(($margin/$revenue)*100,2) : null;

            DB::table('projects')->where('id',$projectId)->update([
                'actual_revenue'=>$revenue,'actual_cost'=>$cost,'actual_margin'=>$margin,
                'actual_margin_percent'=>$marginPercent,'updated_at'=>now()
            ]);
        });
    }

    public function upsertEntry(
        int $projectId,string $entryType,string $category,float $amount,
        string $sourceType,int $sourceId,string $recognizedOn,?string $description=null,bool $recalculate=true
    ): void {
        if (! in_array($entryType,['revenue','cost'],true)) throw new \DomainException('Invalid project financial entry type.');
        if ($amount<0) throw new \DomainException('Project financial amount cannot be negative.');

        $project=DB::table('projects')->find($projectId);
        if (! $project) throw new \DomainException('Project not found.');

        DB::table('project_financial_entries')->updateOrInsert(
            ['project_id'=>$projectId,'entry_type'=>$entryType,'source_type'=>$sourceType,'source_id'=>$sourceId],
            [
                'company_id'=>$project->company_id,'category'=>$category,'amount'=>round($amount,2),
                'description'=>$description,'recognized_on'=>$recognizedOn,'updated_at'=>now(),'created_at'=>now()
            ]
        );

        if ($recalculate) {
            $this->execute($projectId);
        }
    }
}
