<?php
namespace App\Http\Controllers;

use App\Models\Contribution;
use Illuminate\Http\Request;

class ContributionController extends Controller
{
    public function index()
    {
        return response()->json(Contribution::all());
    }

    public function store(Request $request)
    {
        $data = $request->all();
        $item = Contribution::create($data);
        return response()->json($item, 201);
    }

    public function show($id)
    {
        $item = Contribution::findOrFail($id);
        return response()->json($item);
    }

    public function update(Request $request, $id)
    {
        $item = Contribution::findOrFail($id);
        $item->update($request->all());
        return response()->json($item);
    }

    public function destroy($id)
    {
        $item = Contribution::findOrFail($id);
        $item->delete();
        return response()->json(null, 204);
    }
}