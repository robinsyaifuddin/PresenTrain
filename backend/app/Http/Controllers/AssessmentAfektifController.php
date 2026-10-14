<?php
namespace App\Http\Controllers;

use App\Models\AssessmentAfektif;
use Illuminate\Http\Request;

class AssessmentAfektifController extends Controller
{
    public function index()
    {
        return response()->json(AssessmentAfektif::all());
    }

    public function store(Request $request)
    {
        $data = $request->all();
        $item = AssessmentAfektif::create($data);
        return response()->json($item, 201);
    }

    public function show($id)
    {
        $item = AssessmentAfektif::findOrFail($id);
        return response()->json($item);
    }

    public function update(Request $request, $id)
    {
        $item = AssessmentAfektif::findOrFail($id);
        $item->update($request->all());
        return response()->json($item);
    }

    public function destroy($id)
    {
        $item = AssessmentAfektif::findOrFail($id);
        $item->delete();
        return response()->json(null, 204);
    }
}