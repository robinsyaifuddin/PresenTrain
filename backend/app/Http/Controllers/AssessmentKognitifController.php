<?php
namespace App\Http\Controllers;

use App\Models\AssessmentKognitif;
use Illuminate\Http\Request;

class AssessmentKognitifController extends Controller
{
    public function index()
    {
        return response()->json(AssessmentKognitif::all());
    }

    public function store(Request $request)
    {
        $data = $request->all();
        $item = AssessmentKognitif::create($data);
        return response()->json($item, 201);
    }

    public function show($id)
    {
        $item = AssessmentKognitif::findOrFail($id);
        return response()->json($item);
    }

    public function update(Request $request, $id)
    {
        $item = AssessmentKognitif::findOrFail($id);
        $item->update($request->all());
        return response()->json($item);
    }

    public function destroy($id)
    {
        $item = AssessmentKognitif::findOrFail($id);
        $item->delete();
        return response()->json(null, 204);
    }
}