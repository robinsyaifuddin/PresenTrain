<?php
namespace App\Http\Controllers;

use App\Models\AssessmentPsikomotorik;
use Illuminate\Http\Request;

class AssessmentPsikomotorikController extends Controller
{
    public function index()
    {
        return response()->json(AssessmentPsikomotorik::all());
    }

    public function store(Request $request)
    {
        $data = $request->all();
        $item = AssessmentPsikomotorik::create($data);
        return response()->json($item, 201);
    }

    public function show($id)
    {
        $item = AssessmentPsikomotorik::findOrFail($id);
        return response()->json($item);
    }

    public function update(Request $request, $id)
    {
        $item = AssessmentPsikomotorik::findOrFail($id);
        $item->update($request->all());
        return response()->json($item);
    }

    public function destroy($id)
    {
        $item = AssessmentPsikomotorik::findOrFail($id);
        $item->delete();
        return response()->json(null, 204);
    }
}