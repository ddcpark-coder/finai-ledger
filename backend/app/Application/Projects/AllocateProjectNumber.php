<?php
namespace App\Application\Projects;

use Illuminate\Support\Facades\DB;

final class AllocateProjectNumber
{
    public function execute(int $companyId,int $year): string
    {
        return DB::transaction(function () use ($companyId,$year) {
            $sequence=DB::table('project_sequences')
                ->where('company_id',$companyId)->where('year',$year)->lockForUpdate()->first();

            if (! $sequence) {
                DB::table('project_sequences')->insert([
                    'company_id'=>$companyId,'year'=>$year,'next_number'=>2,'created_at'=>now(),'updated_at'=>now()
                ]);
                $number=1;
            } else {
                $number=(int)$sequence->next_number;
                DB::table('project_sequences')->where('id',$sequence->id)->update([
                    'next_number'=>$number+1,'updated_at'=>now()
                ]);
            }

            return sprintf('PROJ-%d-%04d',$year,$number);
        });
    }
}
