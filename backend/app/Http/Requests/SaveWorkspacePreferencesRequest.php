<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class SaveWorkspacePreferencesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()!==null;
    }

    public function rules(): array
    {
        $moduleKeys=array_keys(config('modules',[]));
        return [
            'expected_version'=>['sometimes','integer','min:0'],
            'last_route'=>['nullable','array:module,view,subview'],
            'last_route.module'=>['required_with:last_route','string',Rule::in($moduleKeys)],
            'last_route.view'=>['required_with:last_route','string','max:80'],
            'last_route.subview'=>['nullable','string','max:80'],
            'favorites'=>['sometimes','array','max:8'],
            'favorites.*'=>['required','array:module,view,subview'],
            'favorites.*.module'=>['required','string',Rule::in($moduleKeys)],
            'favorites.*.view'=>['required','string','max:80'],
            'favorites.*.subview'=>['nullable','string','max:80'],
            'appearance'=>['sometimes','array:theme,density'],
            'appearance.theme'=>['sometimes','string',Rule::in(['dark','light'])],
            'appearance.density'=>['sometimes','string',Rule::in(['comfortable','compact'])],
        ];
    }
}
