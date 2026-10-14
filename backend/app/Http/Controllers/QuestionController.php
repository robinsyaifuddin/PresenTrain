<?php
namespace App\Http\Controllers;

use App\Models\Question;
use Illuminate\Http\Request;

class QuestionController extends Controller
{
    public function index()
    {
        return response()->json(Question::all());
    }

    public function store(Request $request)
    {
        $data = $request->all();
        $item = Question::create($data);
        return response()->json($item, 201);
    }

    public function show($id)
    {
        $item = Question::findOrFail($id);
        return response()->json($item);
    }

    public function update(Request $request, $id)
    {
        $item = Question::findOrFail($id);
        $item->update($request->all());
        return response()->json($item);
    }

    public function destroy($id)
    {
        $item = Question::findOrFail($id);
        $item->delete();
        return response()->json(null, 204);
    }
}