<?php
namespace App\Http\Controllers;

use App\Models\Violation;
use Illuminate\Http\Request;

class ViolationController extends Controller
{
    public function index()
    {
        return response()->json(Violation::all());
    }

    public function store(Request $request)
    {
        $data = $request->all();
        $item = Violation::create($data);
        return response()->json($item, 201);
    }

    public function show($id)
    {
        $item = Violation::findOrFail($id);
        return response()->json($item);
    }

    public function update(Request $request, $id)
    {
        $item = Violation::findOrFail($id);
        $item->update($request->all());
        return response()->json($item);
    }

    public function destroy($id)
    {
        $item = Violation::findOrFail($id);
        $item->delete();
        return response()->json(null, 204);
    }
}