////////////////////////////////////////////////////////////////////////////////////////////////////
//                               This file is part of CosmoScout VR                               //
//      and may be used under the terms of the MIT license. See the LICENSE file for details.     //
//                        Copyright: (c) 2019 German Aerospace Center (DLR)                       //
////////////////////////////////////////////////////////////////////////////////////////////////////

#include "Plugin.hpp"

#include "../../../src/cs-utils/utils.hpp"
#include "../../../src/cs-core/GraphicsEngine.hpp"
#include "../../../src/cs-core/GuiManager.hpp"
#include "../../../src/cs-core/SolarSystem.hpp"
#include "../../../src/cs-core/TimeControl.hpp"
#include "../../../src/cs-utils/convert.hpp"

#include <VistaKernel/VistaSystem.h>
#include <VistaKernel/GraphicsManager/VistaSceneGraph.h>
#include <VistaKernelOpenSGExt/VistaOpenSGMaterialTools.h>

EXPORT_FN cs::core::PluginBase *create()
{
  return new cs::vestec::Plugin;
}

EXPORT_FN void destroy(cs::core::PluginBase *pluginBase)
{
  delete pluginBase;
}

namespace cs::vestec
{

Plugin::Plugin()
    : mProperties(std::make_shared<Properties>())
{
   
}

void Plugin::InitGUI()
{
    
}

void Plugin::init()
{
	std::cout << "Init: CosmoScout VR Plugin for the VESTEC EU project" << std::endl;
	m_pGUIFlowEditor = new cs::gui::GuiItem("file://../share/resources/gui/vestecSidebar.html");
	mGuiManager->addGuiItem(m_pGUIFlowEditor, 10);
	m_pGUIFlowEditor->setRelSizeX(1.0f);
	m_pGUIFlowEditor->setRelSizeY(1.0f);
	m_pGUIFlowEditor->setRelPositionY(1.f);
	m_pGUIFlowEditor->setRelPositionX(0.f);
	m_pGUIFlowEditor->setRelOffsetY(-0.45f);
	m_pGUIFlowEditor->setRelOffsetX(0.5f);
	m_pGUIFlowEditor->waitForFinishedLoading();

	//Read the plugin settings from the scene config
	mPluginSettings = mAllSettings->mPlugins.at("csp-vestec");

	// add anchor node and register to solar system
	mVestecTransform = std::make_shared<cs::scene::CelestialAnchorNode>(mSceneGraph->GetRoot(), mSceneGraph->GetNodeBridge(), "", "Earth", "IAU_Earth");
	mSolarSystem->registerAnchor(mVestecTransform);

	// Give the flow editor some time to initialize
	std::this_thread::sleep_for(std::chrono::seconds(1));
	
	//Initialize and append gui elements
	InitGUI();

	std::cout << "[CSP::VESTEC ::Initialize()] Init  done #########################"<< std::endl;
}

void Plugin::deInit()
{
  mSolarSystem->unregisterAnchor(mVestecTransform);
  mSceneGraph->GetRoot()->DisconnectChild(mVestecTransform.get());
}

void Plugin::update()
{
   auto  simTime = mTimeControl->pSimulationTime.get();
   float timeOfDay = cs::utils::convert::toBoostTime(simTime).time_of_day().total_milliseconds() / 1000.0;
   //Update plugin per frame  
}

} // namespace cs::vestec
